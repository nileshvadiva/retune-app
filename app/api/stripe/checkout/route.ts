import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { isSameOrigin } from "@/lib/security";

const PRICE_BY_PLAN: Record<string, string | undefined> = {
  starter: process.env.STRIPE_PRICE_STARTER,
  pro: process.env.STRIPE_PRICE_PRO,
  ultra: process.env.STRIPE_PRICE_ULTRA,
};

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
    return NextResponse.json({ error: "Unknown plan. Choose 'starter', 'pro', or 'ultra'." }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id, stripe_subscription_id, plan, email")
    .eq("id", user.id)
    .single();

  // If already on a paid plan, switch in place (proration) instead of
  // creating a second subscription — avoids double billing.
  if (profile?.stripe_subscription_id && profile.plan !== "free") {
    try {
      const subscription = await stripe.subscriptions.retrieve(
        profile.stripe_subscription_id
      );
      const currentItemId = subscription.items.data[0]?.id;
      await stripe.subscriptions.update(profile.stripe_subscription_id, {
        items: [{ id: currentItemId, price: priceId }],
        proration_behavior: "create_prorations",
      });
      return NextResponse.json({ switched: true });
    } catch {
      // If retrieval fails, fall through to create a new checkout session.
    }
  }

  let customerId = profile?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile?.email ?? user.email ?? undefined,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await supabase
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);
  }

  const sessionParams = {
    customer: customerId,
    mode: "subscription" as const,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?upgraded=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?upgrade_cancelled=true`,
    metadata: { supabase_user_id: user.id, plan: body.plan },
  };

  const session = await stripe.checkout.sessions.create(sessionParams);
  return NextResponse.json({ url: session.url });
}