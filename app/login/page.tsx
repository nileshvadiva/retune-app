"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Script from "next/script";

declare global {
  interface Window {
    turnstile?: {
      render: (selector: string, options: { sitekey: string; callback: (token: string) => void }) => void;
    };
  }
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const supabase = createClient();
  const router = useRouter();

  function handleTurnstileLoad() {
    window.turnstile?.render("#turnstile-widget", {
      sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!,
      callback: (token: string) => setCaptchaToken(token),
    });
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const hasTurnstile = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (hasTurnstile && !captchaToken) {
      setStatus("Please complete the verification check above.");
      return;
    }
    setStatus("Signing in…");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: captchaToken ? { captchaToken } : undefined,
    });
    if (error) {
      setStatus(error.message);
    } else {
      router.push("/dashboard");
      router.refresh();
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
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>Welcome back</h1>
      <p style={{ color: "var(--ink-dim)", fontSize: 14, marginBottom: 28 }}>
        Log in to see your saved history and posts.
      </p>

      <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
          placeholder="Password"
          value={password}
          required
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />
        <p style={{ fontSize: 13, textAlign: "right", marginTop: -4, marginBottom: -4 }}>
          <a href="/forgot-password" style={{ color: "var(--amber)" }}>Forgot password?</a>
        </p>
        <div id="turnstile-widget" />
        <button type="submit" style={buttonStyle}>Log in</button>
      </form>

      <button onClick={handleGoogle} style={{ ...buttonStyle, background: "transparent", border: "1px solid var(--line)", color: "var(--ink)", marginTop: 10 }}>
        Continue with Google
      </button>

      <p style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--amber)", marginTop: 16, minHeight: 16 }}>{status}</p>

      <p style={{ fontSize: 13, color: "var(--ink-dim)", marginTop: 24 }}>
        No account yet? <a href="/signup" style={{ color: "var(--amber)" }}>Sign up</a>
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