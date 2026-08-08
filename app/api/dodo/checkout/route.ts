import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dodo } from "@/lib/dodo";
import { isSameOrigin } from "@/lib/security";

const PRODUCT_BY_PLAN: Record<string, string | undefined> = {
  starter: process.env.DODO_PRODUCT_STARTER,
  pro: process.env.DODO_PRODUCT_PRO,
  ultra: process.env.DODO_PRODUCT_ULTRA,
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

  const plan = body.plan ?? "";
  const productId = PRODUCT_BY_PLAN[plan];
  if (!productId) {
    return NextResponse.json({ error: "Unknown plan. Choose 'starter', 'pro', or 'ultra'." }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("dodo_customer_id, dodo_subscription_id, plan, email")
    .eq("id", user.id)
    .single();

  // Already on a paid plan? Send them to the customer portal to change
  // plans there instead of starting a second, duplicate subscription.
  // (Dodo's plan-switch/proration API isn't wired up here yet — the
  // portal covers this safely in the meantime.)
  if (profile?.dodo_subscription_id && profile.plan !== "free") {
    return NextResponse.json({
      redirectToPortal: true,
      message: "You already have an active subscription. Manage or switch plans from your billing portal.",
    });
  }

  // Reuse the Dodo customer record if we already made one for this user,
  // otherwise create it now and remember the ID.
  let customerId = profile?.dodo_customer_id as string | undefined;
  if (!customerId) {
    const customer = await dodo.customers.create({
      email: profile?.email ?? user.email ?? "",
      name: profile?.email ?? user.email ?? "Retune user",
    });
    customerId = customer.customer_id;
    await supabase
      .from("profiles")
      .update({ dodo_customer_id: customerId })
      .eq("id", user.id);
  }

  const session = await dodo.checkoutSessions.create({
    product_cart: [{ product_id: productId, quantity: 1 }],
    customer: { customer_id: customerId },
    return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?upgraded=true`,
    metadata: {
      supabase_user_id: user.id,
      plan,
    },
  });

  return NextResponse.json({ url: session.checkout_url });
}