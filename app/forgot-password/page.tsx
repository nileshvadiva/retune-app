"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [sent, setSent] = useState(false);
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("Sending reset link…");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    // Always show a generic success message, even on error.
    // This prevents leaking whether an email is registered (account enumeration).
    if (error) {
      console.error(error.message);
    }
    setSent(true);
    setStatus("");
  }

  if (sent) {
    return (
      <main style={{ maxWidth: 380, margin: "80px auto", padding: "0 20px" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>Check your email</h1>
        <p style={{ color: "var(--ink-dim)", fontSize: 14, marginBottom: 28 }}>
          If an account exists for <strong>{email}</strong>, we&apos;ve sent a
          password reset link. It&apos;ll expire in a little while, so use it soon.
        </p>
        <p style={{ fontSize: 13, color: "var(--ink-dim)", marginTop: 24 }}>
          <a href="/login" style={{ color: "var(--amber)" }}>Back to login</a>
        </p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 380, margin: "80px auto", padding: "0 20px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>Reset your password</h1>
      <p style={{ color: "var(--ink-dim)", fontSize: 14, marginBottom: 28 }}>
        Enter the email on your account and we&apos;ll send you a reset link.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          required
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />
        <button type="submit" style={buttonStyle}>Send reset link</button>
      </form>

      <p style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--amber)", marginTop: 16, minHeight: 16 }}>{status}</p>

      <p style={{ fontSize: 13, color: "var(--ink-dim)", marginTop: 24 }}>
        Remembered it? <a href="/login" style={{ color: "var(--amber)" }}>Log in</a>
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