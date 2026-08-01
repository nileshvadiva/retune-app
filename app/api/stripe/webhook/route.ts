import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/server";
import type Stripe from "stripe";

// Maps a Stripe Price ID back to our internal plan name. Keeping this in
// one place means price-based logic never has to be duplicated elsewhere.
function planFromPriceId(priceId: string | undefined): "starter" | "pro" | "ultra" | "free" {
  if (priceId === process.env.STRIPE_PRICE_STARTER) return "starter";
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  if (priceId === process.env.STRIPE_PRICE_ULTRA) return "ultra";
  return "free";
}

// This is the ONLY place that should ever change a user's plan. Never trust
// the browser to tell you a payment succeeded — always trust this webhook,
// which is cryptographically signed by Stripe so we know it's genuine.
export async function POST(request: Request) {
  const body = await request.text();
  const signature = headers().get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createAdminClient();

  switch (event.type) {
    // Fires once, right after a successful first checkout.
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id;
      const plan = (session.metadata?.plan as "starter" | "pro") ?? "starter";
      if (userId) {
        await supabase
          .from("profiles")
          .update({
            plan,
            stripe_subscription_id: session.subscription as string,
            generations_used: 0,
            cycle_reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .eq("id", userId);
      }
      break;
    }

    // Fires on upgrade/downgrade between Starter <-> Pro, or if a payment
    // fails and Stripe marks the subscription past_due/unpaid.
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const isActive = sub.status === "active" || sub.status === "trialing";
      const priceId = sub.items.data[0]?.price.id;
      const plan = isActive ? planFromPriceId(priceId) : "free";
      await supabase
        .from("profiles")
        .update({ plan, stripe_price_id: priceId })
        .eq("stripe_customer_id", sub.customer as string);
      break;
    }

    // User cancelled, or all retries for a failed payment were exhausted —
    // drop them back to the free tier.
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await supabase
        .from("profiles")
        .update({ plan: "free" })
        .eq("stripe_customer_id", sub.customer as string);
      break;
    }

    // Fires every renewal (monthly). This is what resets the generation
    // count each billing cycle — without this, a Pro user's 200 cap would
    // never refill after their first month.
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      await supabase
        .from("profiles")
        .update({
          generations_used: 0,
          cycle_reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq("stripe_customer_id", customerId);
      break;
    }

    // A cardholder has disputed a charge (a chargeback in progress). Stripe
    // doesn't automatically cut off product access when this happens — we
    // do it ourselves, immediately, rather than keep serving someone who
    // may be defrauding you while the dispute is under review.
    case "charge.dispute.created": {
      const dispute = event.data.object as Stripe.Dispute;
      const charge = await stripe.charges.retrieve(dispute.charge as string);
      const customerId = charge.customer as string | null;

      console.error(
        `⚠️ CHARGEBACK: customer ${customerId} disputed a charge of ${dispute.amount / 100} ${dispute.currency}. Reason: ${dispute.reason}. Review in Stripe dashboard.`
      );

      if (customerId) {
        await supabase.from("profiles").update({ plan: "free" }).eq("stripe_customer_id", customerId);
      }
      break;
    }

    default:
      // Unhandled event types are fine to ignore.
      break;
  }

  return NextResponse.json({ received: true });
}
