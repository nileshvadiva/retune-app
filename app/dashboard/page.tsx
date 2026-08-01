import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getClientIp } from "@/lib/get-client-ip";
import RetuneApp from "@/components/RetuneApp";

const FREE_LIMIT = 3; // must match LIMITS.free in app/api/generate/route.ts
const IP_WINDOW_SECONDS = 24 * 60 * 60;
const MAX_SIGNUPS_PER_IP = 3;

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let { data: profile } = await supabase
    .from("profiles")
    .select("plan, generations_used, email, ip_check_passed")
    .eq("id", user.id)
    .single();

  // Fallback IP check for accounts that never went through our custom
  // /api/auth/signup route — this is exactly the Google OAuth case, which
  // creates the Supabase user (and profile row) directly, bypassing it.
  // We can't block the signup itself after the fact, but we CAN make sure
  // an abusive repeat account gets zero free tunes instead of 3 more.
  if (profile && profile.ip_check_passed === false) {
    const ip = getClientIp(headers());
    let allowed = true;
    if (ip !== "unknown") {
      // This function has no grant for the "authenticated" role on purpose
      // (see schema.sql) — it must be called via the admin client.
      const adminClient = createAdminClient();
      const { data, error } = await adminClient.rpc("check_signup_ip_limit", {
        p_ip: ip,
        p_window_seconds: IP_WINDOW_SECONDS,
        p_max_signups: MAX_SIGNUPS_PER_IP,
      });
      if (!error) allowed = data === true;
    }

    const updatePayload: Record<string, unknown> = { ip_check_passed: true, terms_accepted_at: new Date().toISOString() };
    if (!allowed) {
      // Zero out their free tunes rather than trying to sign them out —
      // simpler, and it means the existing paywall UI just does its job.
      updatePayload.generations_used = FREE_LIMIT;
    }
    await supabase.from("profiles").update(updatePayload).eq("id", user.id);
    if (!allowed) {
      profile = { ...profile, generations_used: FREE_LIMIT };
    }
  }

  const { data: history } = await supabase
    .from("history")
    .select("id, source_snippet, output, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <RetuneApp
      initialPlan={profile?.plan ?? "free"}
      initialUsage={profile?.generations_used ?? 0}
      initialHistory={history ?? []}
      userEmail={user.email ?? ""}
    />
  );
}
