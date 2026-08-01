import type { SupabaseClient } from "@supabase/supabase-js";

// Burst protection: even a paying user should not be able to fire dozens
// of requests in a few seconds (whether by accident, a buggy script, or
// deliberate abuse). This is separate from the monthly generations_used
// cap — that limits total volume, this limits speed.
//
// The actual check happens atomically inside Postgres (see
// check_rate_limit in supabase/schema.sql) using a row lock, so two
// near-simultaneous requests can't both read a stale count and both slip
// through — a plain read-then-write here in application code could not
// guarantee that.
const WINDOW_SECONDS = 60;
const MAX_REQUESTS_PER_WINDOW = 8;

export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string
): Promise<{ allowed: boolean }> {
  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_user_id: userId,
    p_window_seconds: WINDOW_SECONDS,
    p_max_requests: MAX_REQUESTS_PER_WINDOW,
  });

  if (error) {
    // Fail open on unexpected DB errors — the monthly cap still applies,
    // and we'd rather briefly allow a request than break the app for
    // every user over a transient database hiccup.
    console.error("Rate limit check failed:", error);
    return { allowed: true };
  }

  return { allowed: data === true };
}
