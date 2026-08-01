import { createBrowserClient } from "@supabase/ssr";

// Used inside React client components ("use client").
// Reads the public (safe to expose) Supabase URL and anon key.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
