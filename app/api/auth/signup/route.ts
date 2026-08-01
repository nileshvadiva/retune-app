import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getClientIp } from "@/lib/get-client-ip";
import { isSameOrigin } from "@/lib/security";
import { isDisposableEmail } from "@/lib/disposable-email-domains";
import { normalizeEmail } from "@/lib/normalize-email";

const WINDOW_SECONDS = 24 * 60 * 60; // 24 hours
const MAX_SIGNUPS_PER_IP = 3; // matches the free plan's 3-tune lifetime cap

// Signup must go through this server route instead of calling
// supabase.auth.signUp() directly from the browser — that's what lets us
// check the IP-based limit BEFORE an account (and its 3 free tunes) exists.
//
// Known limitation: someone could still call Supabase's own public signup
// endpoint directly with the anon key, bypassing this route entirely. This
// stops casual/repeat signups from the same network (the realistic case
// discussed), not a determined scripted attacker — that additionally needs
// a CAPTCHA (e.g. Cloudflare Turnstile) in front of the signup form, which
// is worth adding if you see scripted abuse specifically.
export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const { email, password, captchaToken, agreedToTerms } = body as {
    email?: string;
    password?: string;
    captchaToken?: string;
    agreedToTerms?: boolean;
  };
  if (!email || !password || typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  // Collapses Gmail +alias / dot variations to one canonical address, so
  // test+1@gmail.com and test+2@gmail.com can't both get separate accounts
  // for the same real inbox.
  const normalizedEmail = normalizeEmail(email);

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }
  if (isDisposableEmail(normalizedEmail)) {
    return NextResponse.json(
      { error: "Temporary/disposable email addresses aren't allowed. Please use a real email address." },
      { status: 400 }
    );
  }
  if (agreedToTerms !== true) {
    return NextResponse.json({ error: "You must agree to the Terms of Service and Privacy Policy." }, { status: 400 });
  }

  const ip = getClientIp(request.headers);

  // Uses the service role key because there's no user session yet — this
  // table has no RLS policies for regular users on purpose (see schema.sql).
  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  if (ip !== "unknown") {
    const { data: allowed, error: limitError } = await adminClient.rpc("check_signup_ip_limit", {
      p_ip: ip,
      p_window_seconds: WINDOW_SECONDS,
      p_max_signups: MAX_SIGNUPS_PER_IP,
    });

    if (limitError) {
      // Fail open on a DB hiccup rather than blocking every signup on
      // your site because of a transient error.
      console.error("Signup IP limit check failed:", limitError);
    } else if (allowed === false) {
      return NextResponse.json(
        {
          error:
            "Too many accounts have been created from this network recently. If this is you, please log in to your existing account instead.",
        },
        { status: 429 }
      );
    }
  }

  // This is a normal (anon-key) client, not the admin client — signUp()
  // still goes through Supabase's regular flow, including sending the
  // email confirmation link, exactly as if the browser had called it.
  const anonClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: signUpData, error: signUpError } = await anonClient.auth.signUp({
    email: normalizedEmail,
    password,
    options: captchaToken ? { captchaToken } : undefined,
  });
  if (signUpError) {
    return NextResponse.json({ error: signUpError.message }, { status: 400 });
  }

  // We already validated the IP above, before this account was created —
  // mark it as checked so the dashboard's fallback check (for Google OAuth
  // signups, which don't go through this route) doesn't re-flag it.
  if (signUpData.user) {
    await adminClient
      .from("profiles")
      .update({ ip_check_passed: true, terms_accepted_at: new Date().toISOString() })
      .eq("id", signUpData.user.id);
  }

  return NextResponse.json({ success: true });
}
