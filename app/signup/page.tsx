"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Script from "next/script";

declare global {
  interface Window {
    turnstile?: {
      render: (selector: string, options: { sitekey: string; callback: (token: string) => void }) => void;
    };
  }
}

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const supabase = createClient();

  function handleTurnstileLoad() {
    window.turnstile?.render("#turnstile-widget", {
      sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!,
      callback: (token: string) => setCaptchaToken(token),
    });
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!agreedToTerms) {
      setStatus("Please agree to the Terms and Privacy Policy to continue.");
      return;
    }
    // Only enforce CAPTCHA if Turnstile is actually configured (site key
    // present). This lets you test locally without Cloudflare setup while
    // still enforcing it in production where the key is set.
    const hasTurnstile = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (hasTurnstile && !captchaToken) {
      setStatus("Please complete the verification check above.");
      return;
    }
    setStatus("Creating your account…");
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, captchaToken, agreedToTerms }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error || "Something went wrong.");
      } else {
        setStatus("Check your email to confirm your account.");
      }
    } catch {
      setStatus("Network error — please try again.");
    }
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
  }

  return (
    <main style={{ maxWidth: 380, margin: "80px auto", padding: "0 20px" }}>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        onLoad={handleTurnstileLoad}
        strategy="afterInteractive"
      />
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>Create your account</h1>
      <p style={{ color: "var(--ink-dim)", fontSize: 14, marginBottom: 28 }}>
        Start with 3 free tunes for life, no card required.
      </p>

      <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          required
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />
        <input
          type="password"
          placeholder="Password (min 8 characters)"
          value={password}
          required
          minLength={8}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />
        <div id="turnstile-widget" />
        <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "var(--ink-dim)", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            style={{ marginTop: 3 }}
          />
          <span>
            I agree to the <a href="/terms" target="_blank" style={{ color: "var(--amber)" }}>Terms of Service</a> and{" "}
            <a href="/privacy" target="_blank" style={{ color: "var(--amber)" }}>Privacy Policy</a>.
          </span>
        </label>
        <button type="submit" style={buttonStyle}>Sign up</button>
      </form>

      <button
        onClick={handleGoogle}
        disabled={!agreedToTerms}
        style={{ ...buttonStyle, background: "transparent", border: "1px solid var(--line)", color: "var(--ink)", marginTop: 10, opacity: agreedToTerms ? 1 : 0.5, cursor: agreedToTerms ? "pointer" : "not-allowed" }}
      >
        Continue with Google
      </button>
      {!agreedToTerms && (
        <p style={{ fontSize: 12, color: "var(--ink-dim)", marginTop: 6 }}>Check the box above to enable Google sign-up.</p>
      )}

      <p style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--amber)", marginTop: 16, minHeight: 16 }}>{status}</p>

      <p style={{ fontSize: 13, color: "var(--ink-dim)", marginTop: 24 }}>
        Already have an account? <a href="/login" style={{ color: "var(--amber)" }}>Log in</a>
      </p>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--line)",
  color: "var(--ink)",
  borderRadius: 10,
  padding: "12px 14px",
  fontSize: 14.5,
};

const buttonStyle: React.CSSProperties = {
  background: "var(--amber)",
  color: "#1b1b1f",
  border: "none",
  borderRadius: 999,
  padding: "12px 16px",
  fontWeight: 700,
  fontSize: 14.5,
  cursor: "pointer",
};
