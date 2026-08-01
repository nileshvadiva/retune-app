import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { isSameOrigin } from "@/lib/security";

const PRICE_BY_PLAN: Record<string, string | undefined> = {
  starter: process.env.STRIPE_PRICE_STARTER,
  pro: process.env.STRIPE_PRICE_PRO,
  ultra: process.env.STRIPE_PRICE_ULTRA,
};

// Creates a real Stripe Checkout session. The browser is redirected to
// Stripe's own hosted payment page — card details never touch our server,
// which is what keeps us out of PCI-compliance scope.
export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  let body: { plan?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }
  const priceId = PRICE_BY_PLAN[body.plan ?? ""];
  if (!priceId) {
    return NextResponse.json({ error: "Unknown plan. Choose 'starter' or 'pro'." }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id, stripe_subscription_id, plan, email")
    .eq("id", user.id)
    .single();

  // If they already have an active paid subscription, switch it in place
  // (with proration) instead of creating a second, separate subscription —
  // otherwise they'd be charged for BOTH plans at once.
  if (profile?.stripe_subscription_id && profile.plan !== "free") {
    const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
    const currentItemId = subscription.items.data[0]?.id;

    await stripe.subscriptions.update(profile.stripe_subscription_id, {
      items: [{ id: currentItemId, price: priceId }],
      proration_behavior: "create_prorations",
    });
    // The webhook (customer.subscription.updated) will sync the new plan
    // into our database once Stripe confirms the change — we don't update
    // it directly here, since the webhook is the one source of truth.
    return NextResponse.json({ switched: true });
  }

  // Reuse an existing Stripe customer if we already made one, otherwise
  // create it now and remember it — avoids duplicate customers per user.
  let customerId = profile?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile?.email ?? user.email ?? undefined,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await supabase.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    // Stripe Checkout auto-detects the customer's card country and shows
    // the right currency/format — no per-country setup needed on our end.
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?upgraded=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?upgrade_cancelled=true`,
    metadata: { supabase_user_id: user.id, plan: body.plan },
  });

  return NextResponse.json({ url: session.url });
}
