// supabase/functions/before-user-created-hook/index.ts
//
// HTTP-based "Before User Created" Auth Hook. Runs in Deno (not Node), so
// the fetch() and DNS-resolution APIs differ slightly from the Next.js
// app's lib/check-disposable-email.ts, but the logic is the same 3 layers:
//   1. Local denylist — reads the SAME public.signup_email_domains table
//      seeded earlier, so there's one source of truth instead of two
//      hardcoded lists drifting apart.
//   2. MX-record heuristic — catches new front domains routing through an
//      already-known disposable provider's mail server.
//   3. Disify API — ~30k-domain live database, last line of defense.
//
// IMPORTANT: the secret itself does NOT go in this file. It lives in a
// separate .env file at the project root, set via
// `supabase secrets set --env-file .env`, and this file only reads it BY
// NAME at runtime with Deno.env.get("BEFORE_USER_CREATED_HOOK_SECRET").
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const whSecret = (Deno.env.get("BEFORE_USER_CREATED_HOOK_SECRET") ?? "").replace("v1,whsec_", "");
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const wh = new Webhook(whSecret);
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const DISIFY_TIMEOUT_MS = 3000;
const MX_TIMEOUT_MS = 2000;

async function isDomainInLocalList(domain: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("signup_email_domains")
    .select("domain")
    .eq("domain", domain)
    .maybeSingle();

  if (error) {
    console.error("Local domain list lookup failed:", error);
    return false; // don't let a DB hiccup block this layer; other layers still run
  }
  return data !== null;
}

async function hasKnownDisposableMx(domain: string): Promise<boolean> {
  try {
    const lookup = Deno.resolveDns(domain, "MX");
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("MX lookup timed out")), MX_TIMEOUT_MS)
    );
    const records = await Promise.race([lookup, timeout]);

    for (const record of records) {
      const mxHost = record.exchange.toLowerCase().replace(/\.$/, "");
      const parts = mxHost.split(".");
      const mxBase = parts.slice(-2).join(".");
      if ((await isDomainInLocalList(mxHost)) || (await isDomainInLocalList(mxBase))) {
        return true;
      }
    }
    return false;
  } catch (err) {
    console.error("MX lookup failed or found nothing:", err);
    return false;
  }
}

async function checkDisify(email: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DISIFY_TIMEOUT_MS);
    const res = await fetch(`https://disify.com/api/email/${encodeURIComponent(email)}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`Disify HTTP ${res.status}`);
    const data = await res.json();
    if (typeof data.disposable !== "boolean") throw new Error("Unexpected Disify response shape");
    return data.disposable;
  } catch (err) {
    console.error("Disify check failed:", err);
    return false; // fail open — layers 1-2 already ran
  }
}

async function isDisposableEmail(email: string): Promise<boolean> {
  const domain = email.split("@")[1]?.toLowerCase().trim();
  if (!domain) return false;

  if (await isDomainInLocalList(domain)) return true;
  if (await hasKnownDisposableMx(domain)) return true;
  return await checkDisify(email);
}

Deno.serve(async (req) => {
  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);

  let event: { user?: { email?: string } };
  try {
    event = wh.verify(payload, headers) as typeof event;
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response(
      JSON.stringify({ error: { message: "Invalid request format", http_code: 400 } }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const email = event?.user?.email?.toLowerCase() ?? "";
  console.log("Signup check:", email);

  // Disposable email check only — local list, MX heuristic, then Disify.
  // IP-based limiting is already enforced by app/api/auth/signup/route.ts
  // for normal signups; duplicating it here added an RPC error without
  // adding real protection, so it's intentionally left out of this hook.
  if (email && (await isDisposableEmail(email))) {
    console.log("Signup blocked (disposable email):", email);
    return new Response(
      JSON.stringify({
        error: {
          message: "Temporary/disposable email addresses aren't allowed. Please use a real email address.",
          http_code: 400,
        },
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  console.log("Signup approved:", email);
  return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } });
});