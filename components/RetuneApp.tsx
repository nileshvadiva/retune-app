"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

// Must match LIMITS in app/api/generate/route.ts — shown here just for
// display; the server is what actually enforces these.
const LIMITS: Record<string, number> = { free: 3, starter: 50, pro: 200, ultra: 150 };
const PLAN_LABELS: Record<string, string> = { free: "Free", starter: "Starter", pro: "Pro", ultra: "Ultra" };
// Must match MAX_CHARS in app/api/generate/route.ts — this is just for
// showing the live counter early; the server enforces the real limit.
const MAX_CHARS = 40000;

type ReelScene = { time: string; text: string };
type GeneratedOutput = {
  twitter: string[];
  linkedin: string;
  reel: { hook: string; scenes: ReelScene[] };
};
type HistoryEntry = {
  id: string;
  source_snippet: string;
  output: GeneratedOutput;
  created_at: string;
};

export default function RetuneApp({
  initialPlan,
  initialUsage,
  initialHistory,
  userEmail,
}: {
  initialPlan: string;
  initialUsage: number;
  initialHistory: HistoryEntry[];
  userEmail: string;
}) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<GeneratedOutput | null>(null);
  const [plan, setPlan] = useState(initialPlan);
  const [usage, setUsage] = useState(initialUsage);
  const [history, setHistory] = useState<HistoryEntry[]>(initialHistory);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();
  const isPaid = plan !== "free";
  const limit = LIMITS[plan] ?? LIMITS.free;
  const limitReached = usage >= limit;

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function handleUpgrade(targetPlan: "starter" | "pro" | "ultra") {
    setStatus("Redirecting to checkout…");
    setIsError(false);
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: targetPlan }),
    });
    const data = await res.json();

    if (data.switched) {
      setStatus("Plan updated — refreshing…");
      setTimeout(() => {
        router.refresh();
        window.location.reload();
      }, 1200);
      return;
    }

    if (data.url) {
      window.location.href = data.url;
    } else {
      setStatus(data.error || "Could not start checkout.");
      setIsError(true);
    }
  }

  async function handleManageSubscription() {
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  }

  async function handleGenerate() {
    if (!text.trim()) {
      setStatus("Paste something into the source tape first.");
      setIsError(true);
      return;
    }
    if (text.length > MAX_CHARS) {
      setStatus(`Too long — keep it under ${MAX_CHARS.toLocaleString()} characters (~6,000-7,000 words). Try one episode or chapter at a time.`);
      setIsError(true);
      return;
    }
    if (limitReached) return;

    setLoading(true);
    setIsError(false);
    setStatus("Tuning in…");
    setOutput(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus(data.error || "Something went wrong.");
        setIsError(true);
        if (data.limitReached) setUsage(limit);
        return;
      }

      setOutput(data.data);
      setStatus("Locked onto all three stations.");
      setUsage((u) => u + 1);

      const snippet = text.trim().slice(0, 60).replace(/\s+/g, " ") + (text.length > 60 ? "…" : "");
      setHistory((h) => [
        { id: crypto.randomUUID(), source_snippet: snippet, output: data.data, created_at: new Date().toISOString() },
        ...h,
      ]);
    } catch (err) {
      setStatus("Signal lost — network error. Try again.");
      setIsError(true);
    } finally {
      setLoading(false);
    }
  }

  function copy(key: string, value: string) {
    navigator.clipboard.writeText(value).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1600);
    });
  }

  function loadHistoryEntry(entry: HistoryEntry) {
    setOutput(entry.output);
    setStatus("Loaded from history.");
    setIsError(false);
  }

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "40px 20px 80px" }} className="fade-in">
      {/* Top bar */}
      <div className="fade-up" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30, fontFamily: "var(--mono)", fontSize: 12 }}>
        <span style={{ color: "var(--ink-dim)" }}>{userEmail}</span>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={pill(limitReached)}>
            {PLAN_LABELS[plan] ?? "Free"} · {usage} / {limit} tunes used{plan === "free" ? " (lifetime)" : ""}
          </span>
          {isPaid && (
            <button onClick={handleManageSubscription} style={linkButton}>manage</button>
          )}
          <button onClick={handleSignOut} style={linkButton}>sign out</button>
        </div>
      </div>

      {/* Header / dial */}
      <header style={{ textAlign: "center", marginBottom: 44 }}>
        <div style={{ fontFamily: "var(--mono)", fontWeight: 700, fontSize: 13, letterSpacing: "0.35em", color: "var(--amber)", marginBottom: 6 }}>RETUNE</div>
        <h1 style={{ fontSize: "clamp(30px, 6vw, 42px)", fontWeight: 800, margin: "0 0 8px", letterSpacing: "-0.02em" }}>One recording. Every station.</h1>
        <p style={{ color: "var(--ink-dim)", fontSize: 15, marginBottom: 28 }}>Paste a transcript, tune in, get platform-native posts back.</p>

        <div style={{ position: "relative", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: "18px 20px 22px", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontFamily: "var(--mono)", fontSize: 12, fontWeight: 700, color: "var(--ink-dim)", position: "relative", zIndex: 2 }}>
            <span style={{ color: loading ? "var(--blue)" : "var(--ink-dim)", transition: "color .3s" }}>88.1 · THREAD FM</span>
            <span style={{ color: loading ? "var(--teal)" : "var(--ink-dim)", transition: "color .3s" }}>98.6 · LINKEDIN AM</span>
            <span style={{ color: loading ? "var(--pink)" : "var(--ink-dim)", transition: "color .3s" }}>104.2 · REEL RADIO</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
            {Array.from({ length: 11 }).map((_, i) => (
              <span key={i} style={{ width: 1, height: 8, background: "var(--line)" }} />
            ))}
          </div>
          {loading && (
            <div style={{
              position: "absolute", top: 14, left: "6%", width: 2, height: 30,
              background: "var(--amber)", boxShadow: "0 0 8px var(--amber)", borderRadius: 2,
              animation: "needleSweep 2.2s ease-in-out infinite",
            }} />
          )}
        </div>
      </header>

      {/* Input console or paywall */}
      {limitReached ? (
        <section style={{ background: "var(--surface)", border: "1px solid var(--amber)", borderRadius: 14, padding: "26px 24px", textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.25em", color: "var(--amber)", marginBottom: 10 }}>SIGNAL LIMIT REACHED</div>
          <h3 style={{ margin: "0 0 8px", fontSize: 20 }}>
            {plan === "free" ? `You've used all ${limit} free tunes (lifetime limit)` : `You've used your ${limit} tunes this month`}
          </h3>
          <p style={{ color: "var(--ink-dim)", fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
            {plan === "ultra"
              ? "Your limit resets on your next billing date."
              : plan === "free"
              ? "This won't come back — upgrade for tunes every month instead."
              : "Upgrade for more tunes a month."}
          </p>
          {plan !== "ultra" && (
            <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
              {plan !== "starter" && plan !== "pro" && (
                <div className="hover-lift" style={{ background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 12, padding: "18px 20px", minWidth: 180 }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink-dim)", marginBottom: 6 }}>STARTER</div>
                  <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>$19<span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-dim)" }}>/mo</span></div>
                  <div style={{ fontSize: 13, color: "var(--ink-dim)", marginBottom: 14 }}>50 tunes / month</div>
                  <button onClick={() => handleUpgrade("starter")} className="btn-ghost" style={{ width: "100%", background: "transparent", border: "1px solid var(--amber)", color: "var(--amber)", padding: "9px 16px", borderRadius: 999, fontWeight: 700, cursor: "pointer" }}>
                    Choose Starter
                  </button>
                </div>
              )}
              {plan !== "pro" && (
                <div className="hover-lift" style={{ background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 12, padding: "18px 20px", minWidth: 180 }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink-dim)", marginBottom: 6 }}>PRO</div>
                  <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>$39<span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-dim)" }}>/mo</span></div>
                  <div style={{ fontSize: 13, color: "var(--ink-dim)", marginBottom: 14 }}>200 tunes / month</div>
                  <button onClick={() => handleUpgrade("pro")} className="btn-ghost" style={{ width: "100%", background: "transparent", border: "1px solid var(--amber)", color: "var(--amber)", padding: "9px 16px", borderRadius: 999, fontWeight: 700, cursor: "pointer" }}>
                    Choose Pro
                  </button>
                </div>
              )}
              <div className="hover-lift" style={{ background: "var(--surface-2)", border: "1px solid var(--amber)", borderRadius: 12, padding: "18px 20px", minWidth: 180 }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--amber)", marginBottom: 6 }}>ULTRA · OPUS</div>
                <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>$59<span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-dim)" }}>/mo</span></div>
                <div style={{ fontSize: 13, color: "var(--ink-dim)", marginBottom: 14 }}>150 tunes / month, Claude Opus</div>
                <button onClick={() => handleUpgrade("ultra")} className="btn-amber" style={{ width: "100%", background: "var(--amber)", border: "none", color: "#1b1b1f", padding: "9px 16px", borderRadius: 999, fontWeight: 700, cursor: "pointer" }}>
                  Choose Ultra
                </button>
              </div>
            </div>
          )}
        </section>
      ) : (
        <section style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: 22, marginBottom: 24 }}>
          <label style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.2em", color: "var(--ink-dim)", display: "block", marginBottom: 10 }}>
            SOURCE TAPE — paste transcript, script, or draft
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. a podcast transcript, YouTube video script, or blog draft you want repurposed..."
            style={{ width: "100%", minHeight: 150, background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 10, color: "var(--ink)", fontSize: 14.5, lineHeight: 1.6, padding: 14, resize: "vertical" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, flexWrap: "wrap", gap: 12 }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: text.length > MAX_CHARS ? "var(--pink)" : text.length > MAX_CHARS * 0.9 ? "var(--amber)" : "var(--ink-dim)" }}>
              {text.length.toLocaleString()} / {MAX_CHARS.toLocaleString()} characters
            </span>
            <button
              onClick={handleGenerate}
              disabled={loading || text.length > MAX_CHARS}
              className={loading || text.length > MAX_CHARS ? "" : "btn-amber"}
              style={{ background: "var(--amber)", color: "#1b1b1f", border: "none", padding: "12px 22px", borderRadius: 999, fontWeight: 700, fontSize: 14.5, cursor: loading || text.length > MAX_CHARS ? "default" : "pointer", opacity: loading || text.length > MAX_CHARS ? 0.55 : 1 }}
            >
              {loading ? "Tuning in…" : "Tune in →"}
            </button>
          </div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: isError ? "var(--pink)" : "var(--amber)", minHeight: 16, marginTop: 10 }}>{status}</div>
        </section>
      )}

      {/* Output stations */}
      {output && (
        <section style={{ display: "grid", gap: 18, marginBottom: 30 }}>
          <div className="fade-up" style={{ animationDelay: "0s" }}>
            <StationCard color="var(--blue)" title="88.1 · Thread FM" tag="X / Twitter">
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {output.twitter.map((t, i) => (
                  <div key={i} style={{ background: "var(--surface-2)", borderRadius: 10, padding: "12px 14px", fontSize: 14.5, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-dim)", marginRight: 6 }}>{i + 1}/{output.twitter.length}</span>
                    {t}
                  </div>
                ))}
              </div>
              <CopyButton onClick={() => copy("twitter", output.twitter.map((t, i) => `${i + 1}/ ${t}`).join("\n\n"))} copied={copiedKey === "twitter"} color="var(--blue)" label="Copy thread" />
            </StationCard>
          </div>

          <div className="fade-up" style={{ animationDelay: "0.12s" }}>
            <StationCard color="var(--teal)" title="98.6 · LinkedIn AM" tag="LinkedIn">
              <div style={{ fontSize: 15, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{output.linkedin}</div>
              <CopyButton onClick={() => copy("linkedin", output.linkedin)} copied={copiedKey === "linkedin"} color="var(--teal)" label="Copy post" />
            </StationCard>
          </div>

          <div className="fade-up" style={{ animationDelay: "0.24s" }}>
            <StationCard color="var(--pink)" title="104.2 · Reel Radio" tag="IG / TikTok Script">
              <div style={{ fontWeight: 700, fontSize: 15.5, marginBottom: 12 }}>"{output.reel.hook}"</div>
              {output.reel.scenes.map((s, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "10px 0", borderTop: i === 0 ? "none" : "1px dashed var(--line)", fontSize: 14, lineHeight: 1.55 }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--pink)", flexShrink: 0, width: 52, paddingTop: 2 }}>{s.time}</span>
                  <span>{s.text}</span>
                </div>
              ))}
              <CopyButton
                onClick={() => copy("reel", `HOOK: ${output.reel.hook}\n\n${output.reel.scenes.map((s) => `[${s.time}] ${s.text}`).join("\n")}`)}
                copied={copiedKey === "reel"}
                color="var(--pink)"
                label="Copy script"
              />
            </StationCard>
          </div>
        </section>
      )}

      {/* History */}
      <section style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: "20px 22px" }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.2em", color: "var(--ink-dim)", marginBottom: 14 }}>TUNE HISTORY</div>
        {history.length === 0 ? (
          <div style={{ color: "var(--ink-dim)", fontSize: 13, textAlign: "center", padding: "10px 0" }}>No tunes yet — your generations will show up here.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {history.map((entry) => (
              <div
                key={entry.id}
                onClick={() => loadHistoryEntry(entry)}
                className="hover-lift"
                style={{ display: "flex", justifyContent: "space-between", background: "var(--surface-2)", borderRadius: 8, padding: "10px 14px", cursor: "pointer", fontSize: 13, gap: 12 }}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{entry.source_snippet}</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--ink-dim)", flexShrink: 0 }}>
                  {new Date(entry.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StationCard({ color, title, tag, children }: { color: string; title: string; tag: string; children: React.ReactNode }) {
  return (
    <article className="hover-lift" style={{ background: "var(--surface)", border: "1px solid var(--line)", borderLeft: `3px solid ${color}`, borderRadius: 12, padding: "20px 22px" }}>
      <h2 style={{ fontFamily: "var(--mono)", fontSize: 13, fontWeight: 700, color, margin: "0 0 14px", display: "flex", alignItems: "center", gap: 10 }}>
        {title}
        <span style={{ fontFamily: "var(--sans)", fontWeight: 600, fontSize: 11, color: "var(--ink-dim)", background: "var(--surface-2)", padding: "2px 9px", borderRadius: 999 }}>{tag}</span>
      </h2>
      {children}
    </article>
  );
}

function CopyButton({ onClick, copied, color, label }: { onClick: () => void; copied: boolean; color: string; label: string }) {
  return (
    <button
      onClick={onClick}
      className="btn-ghost"
      style={{ marginTop: 16, fontFamily: "var(--mono)", fontSize: 11.5, background: "transparent", color: copied ? color : "var(--ink-dim)", border: `1px solid ${copied ? color : "var(--line)"}`, padding: "7px 14px", borderRadius: 999, cursor: "pointer" }}
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}

function pill(low: boolean): React.CSSProperties {
  return {
    background: "var(--surface)",
    border: `1px solid ${low ? "var(--pink)" : "var(--line)"}`,
    padding: "5px 12px",
    borderRadius: 999,
    color: low ? "var(--pink)" : "var(--ink-dim)",
  };
}

const linkButton: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "var(--ink-dim)",
  textDecoration: "underline",
  cursor: "pointer",
  fontFamily: "var(--mono)",
  fontSize: 11.5,
};
