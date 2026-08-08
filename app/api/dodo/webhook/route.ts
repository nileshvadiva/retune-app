import { Webhooks } from "@dodopayments/nextjs";
import { createAdminClient } from "@/lib/supabase/server";

// Maps a Dodo Product ID back to our internal plan name.
function planFromProductId(productId: string | undefined): "starter" | "pro" | "ultra" | "free" {
  if (productId === process.env.DODO_PRODUCT_STARTER) return "starter";
  if (productId === process.env.DODO_PRODUCT_PRO) return "pro";
  if (productId === process.env.DODO_PRODUCT_ULTRA) return "ultra";
  return "free";
}

// This is the ONLY place that should ever change a user's plan. Never trust
// the browser to tell you a payment succeeded — always trust this webhook,
// which is cryptographically signed by Dodo so we know it's genuine. The
// @dodopayments/nextjs Webhooks() helper verifies that signature for us
// before any of the handlers below run.
export const POST = Webhooks({
  webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_KEY!,

  // Fires once a subscription is successfully activated — i.e. right after
  // a successful first checkout.
  onSubscriptionActive: async (payload) => {
    const data = payload.data as any;
    const customerId = data.customer?.customer_id as string | undefined;
    const productId = data.product_id as string | undefined;
    const subscriptionId = data.subscription_id as string | undefined;
    if (!customerId) return;

    const supabase = createAdminClient();
    await supabase
      .from("profiles")
      .update({
        plan: planFromProductId(productId),
        dodo_subscription_id: subscriptionId,
        dodo_product_id: productId,
        generations_used: 0,
        cycle_reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq("dodo_customer_id", customerId);
  },

  // Fires every renewal (monthly). This is what resets the generation
  // count each billing cycle — without this, a paid user's cap would
  // never refill after their first month.
  onSubscriptionRenewed: async (payload) => {
    const data = payload.data as any;
    const customerId = data.customer?.customer_id as string | undefined;
    if (!customerId) return;

    const supabase = createAdminClient();
    await supabase
      .from("profiles")
      .update({
        generations_used: 0,
        cycle_reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq("dodo_customer_id", customerId);
  },

  // Covers upgrade/downgrade between plans, since Dodo fires this on any
  // subscription field change (including product/price changes).
  onSubscriptionUpdated: async (payload) => {
    const data = payload.data as any;
    const customerId = data.customer?.customer_id as string | undefined;
    const productId = data.product_id as string | undefined;
    const status = data.status as string | undefined;
    if (!customerId) return;

    const isActive = status === "active" || status === "trialing";
    const supabase = createAdminClient();
    await supabase
      .from("profiles")
      .update({
        plan: isActive ? planFromProductId(productId) : "free",
        dodo_product_id: productId,
      })
      .eq("dodo_customer_id", customerId);
  },

  // Renewal payment failed repeatedly and Dodo paused the subscription.
  onSubscriptionOnHold: async (payload) => {
    const data = payload.data as any;
    const customerId = data.customer?.customer_id as string | undefined;
    if (!customerId) return;

    const supabase = createAdminClient();
    await supabase.from("profiles").update({ plan: "free" }).eq("dodo_customer_id", customerId);
  },

  // User cancelled, or the subscription ran its course and ended.
  onSubscriptionCancelled: async (payload) => {
    const data = payload.data as any;
    const customerId = data.customer?.customer_id as string | undefined;
    if (!customerId) return;

    const supabase = createAdminClient();
    await supabase.from("profiles").update({ plan: "free" }).eq("dodo_customer_id", customerId);
  },

  onSubscriptionExpired: async (payload) => {
    const data = payload.data as any;
    const customerId = data.customer?.customer_id as string | undefined;
    if (!customerId) return;

    const supabase = createAdminClient();
    await supabase.from("profiles").update({ plan: "free" }).eq("dodo_customer_id", customerId);
  },

  // A cardholder has disputed a charge (a chargeback in progress). Dodo
  // doesn't automatically cut off product access when this happens — we
  // do it ourselves, immediately, rather than keep serving someone who
  // may be defrauding you while the dispute is under review.
  onDisputeOpened: async (payload) => {
    const data = payload.data as any;
    const customerId = data.customer?.customer_id as string | undefined;

    console.error(
      `⚠️ CHARGEBACK: customer ${customerId} disputed a charge. Review in Dodo dashboard.`
    );

    if (!customerId) return;
    const supabase = createAdminClient();
    await supabase.from("profiles").update({ plan: "free" }).eq("dodo_customer_id", customerId);
  },
});