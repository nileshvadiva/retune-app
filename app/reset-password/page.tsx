"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("");
  const [ready, setReady] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  // Supabase sends the user here with a token in the URL. It fires a
  // PASSWORD_RECOVERY auth event once the SDK reads it — until then, don't
  // show the form (there's no valid session to update yet).
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password.length < 8) {
      setStatus("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setStatus("Passwords don't match.");
      return;
    }

    setStatus("Updating password…");
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setStatus(error.message);
    } else {
      setStatus("Password updated. Redirecting…");
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 1200);
    }
  }

  if (!ready) {
    return (
      <main style={{ maxWidth: 380, margin: "80px auto", padding: "0 20px" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>Reset your password</h1>
        <p style={{ color: "var(--ink-dim)", fontSize: 14 }}>
          Verifying your reset link…
        </p>
        <p style={{ fontSize: 13, color: "var(--ink-dim)", marginTop: 24 }}>
          Link expired or invalid?{" "}
          <a href="/forgot-password" style={{ color: "var(--amber)" }}>Request a new one</a>
        </p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 380, margin: "80px auto", padding: "0 20px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>Set a new password</h1>
      <p style={{ color: "var(--ink-dim)", fontSize: 14, marginBottom: 28 }}>
        Choose a new password for your account.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input
          type="password"
          placeholder="New password"
          value={password}
          required
          minLength={8}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />
        <input
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          required
          minLength={8}
          onChange={(e) => setConfirmPassword(e.target.value)}
          style={inputStyle}
        />
        <button type="submit" style={buttonStyle}>Update password</button>
      </form>

      <p style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--amber)", marginTop: 16, minHeight: 16 }}>{status}</p>
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