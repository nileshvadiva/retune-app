import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function LandingPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "0 20px 100px" }}>

      {/* ── NAV ── */}
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "28px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
  <img src="/logo.png" alt="Retune" style={{ width: 26, height: 26 }} />
  <span style={{ fontFamily: "var(--mono)", fontWeight: 700, fontSize: 14, letterSpacing: "0.3em", color: "var(--amber)" }}>RETUNE</span>
</div>
        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          <a href="/login" style={{ color: "var(--ink-dim)", fontSize: 14, textDecoration: "none" }}>Log in</a>
          <a href="/signup" className="btn-amber" style={{ background: "var(--amber)", color: "#1b1b1f", padding: "9px 18px", borderRadius: 999, fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
            Start free
          </a>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ textAlign: "center", padding: "60px 0 50px" }} className="fade-up">
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(232,163,61,0.12)", border: "1px solid rgba(232,163,61,0.3)", borderRadius: 999, padding: "6px 16px", marginBottom: 24 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--amber)", display: "inline-block", boxShadow: "0 0 6px var(--amber)" }} />
          <span style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.2em", color: "var(--amber)" }}>ONE TRANSCRIPT → THREE PLATFORMS</span>
        </div>
        <h1 style={{ fontSize: "clamp(38px, 7vw, 62px)", fontWeight: 800, lineHeight: 1.06, letterSpacing: "-0.03em", margin: "0 0 20px" }}>
          One recording.<br />Every station.
        </h1>
        <p style={{ color: "var(--ink-dim)", fontSize: 18, maxWidth: 500, margin: "0 auto 14px", lineHeight: 1.65 }}>
          Turn any podcast or video transcript into a LinkedIn post,
          Twitter thread, and Reel script — in under 60 seconds.
        </p>
        <p style={{ color: "var(--ink-dim)", fontSize: 14, marginBottom: 32 }}>
          Saves creators <strong style={{ color: "var(--ink)" }}>3-4 hours</strong> of manual repurposing every week.
        </p>
        <a href="/signup" className="btn-amber" style={{ display: "inline-block", background: "var(--amber)", color: "#1b1b1f", padding: "15px 34px", borderRadius: 999, fontWeight: 700, fontSize: 16, textDecoration: "none" }}>
          Try 3 tunes free →
        </a>
        <div style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--ink-dim)", marginTop: 12 }}>no card required · 30 second setup</div>

        {/* Animated dial */}
        <div style={{ position: "relative", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: "22px 24px 26px", marginTop: 50, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, position: "relative", zIndex: 2 }}>
            <StationLabel color="var(--blue)" delay={0}>88.1 · THREAD FM</StationLabel>
            <StationLabel color="var(--teal)" delay={0.7}>98.6 · LINKEDIN AM</StationLabel>
            <StationLabel color="var(--pink)" delay={1.4}>104.2 · REEL RADIO</StationLabel>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
            {Array.from({ length: 14 }).map((_, i) => (
              <span key={i} style={{ width: 1, height: 8, background: "var(--line)" }} />
            ))}
          </div>
          <div style={{
            position: "absolute", top: 22, left: "6%", width: 2, height: 30,
            background: "var(--amber)", boxShadow: "0 0 10px var(--amber)", borderRadius: 2,
            animation: "needleSweep 4.2s ease-in-out infinite",
          }} />
        </div>
      </section>

      {/* ── SOCIAL PROOF STRIP ── */}
      <section style={{ display: "flex", justifyContent: "center", gap: "clamp(24px,5vw,60px)", flexWrap: "wrap", padding: "10px 0 50px", borderBottom: "1px solid var(--line)" }}>
        {[
          { num: "3–4 hrs", label: "saved per week" },
          { num: "3 outputs", label: "from 1 transcript" },
          { num: "60 sec", label: "average generation time" },
          { num: "40K chars", label: "max input supported" },
        ].map(({ num, label }) => (
          <div key={label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: "var(--amber)" }}>{num}</div>
            <div style={{ fontSize: 12, color: "var(--ink-dim)", marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: "60px 0 20px" }}>
        <h2 style={{ textAlign: "center", fontSize: 26, fontWeight: 800, marginBottom: 10 }}>How it works</h2>
        <p style={{ textAlign: "center", color: "var(--ink-dim)", fontSize: 15, marginBottom: 40 }}>Three steps. No learning curve.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 18 }}>
          <StepCard num="01" color="var(--blue)" title="Paste your transcript" text="Copy any podcast transcript, YouTube script, or blog draft — up to ~6,000 words." />
          <StepCard num="02" color="var(--teal)" title="Hit Tune in" text="Our AI rewrites it natively for each platform — right tone, right length, right hooks." />
          <StepCard num="03" color="var(--pink)" title="Copy & publish" text="Each output is ready to paste straight into LinkedIn, Twitter, or your teleprompter." />
        </div>
      </section>

      {/* ── FEATURE STRIP ── */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 18, padding: "50px 0" }}>
        <FeatureCard icon="🎙" title="Podcasters" text="Turn every episode into a week of social content automatically." />
        <FeatureCard icon="🎬" title="YouTubers" text="Repurpose your video script into LinkedIn posts and Twitter threads." />
        <FeatureCard icon="💼" title="Coaches & Consultants" text="Share your expertise across platforms to attract new clients." />
        <FeatureCard icon="📣" title="Marketing Agencies" text="Scale content production across multiple clients — Ultra plan." />
      </section>

      {/* ── PRICING ── */}
      <section style={{ padding: "20px 0 0" }}>
        <h2 style={{ textAlign: "center", fontSize: 26, fontWeight: 800, marginBottom: 10 }}>Simple pricing</h2>
        <p style={{ textAlign: "center", color: "var(--ink-dim)", fontSize: 15, marginBottom: 40 }}>Start free. Upgrade when you're ready.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 18 }}>
          <PriceCard name="Free" price="$0" cap="3 tunes total" note="Try before you buy" cta="Start free" href="/signup" />
          <PriceCard name="Starter" price="$19" cap="50 tunes / month" note="Perfect for weekly creators" cta="Choose Starter" href="/signup" highlight />
          <PriceCard name="Pro" price="$39" cap="100 tunes / month" note="For daily content creators" cta="Choose Pro" href="/signup" />
          <PriceCard name="Ultra" price="$59" cap="150 tunes / month" note="Premium AI, best quality" cta="Choose Ultra" href="/signup" />
        </div>
        <p style={{ textAlign: "center", color: "var(--ink-dim)", fontSize: 13, marginTop: 20 }}>
          All paid plans renew monthly · Cancel anytime from your dashboard
        </p>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section style={{ textAlign: "center", marginTop: 80, padding: "50px 30px", background: "var(--surface)", borderRadius: 20, border: "1px solid var(--line)" }}>
        <h2 style={{ fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 800, margin: "0 0 14px", letterSpacing: "-0.02em" }}>
          Ready to tune in?
        </h2>
        <p style={{ color: "var(--ink-dim)", fontSize: 16, marginBottom: 28 }}>
          Join creators saving hours every week on content repurposing.
        </p>
        <a href="/signup" className="btn-amber" style={{ display: "inline-block", background: "var(--amber)", color: "#1b1b1f", padding: "14px 32px", borderRadius: 999, fontWeight: 700, fontSize: 15.5, textDecoration: "none" }}>
          Get started free →
        </a>
        <div style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--ink-dim)", marginTop: 12 }}>3 free tunes · no card required</div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ textAlign: "center", marginTop: 60, paddingTop: 24, borderTop: "1px solid var(--line)", color: "var(--ink-dim)", fontSize: 13 }}>
        © {new Date().getFullYear()} Retune ·{" "}
        <a href="/privacy" style={{ color: "var(--ink-dim)" }}>Privacy</a> ·{" "}
        <a href="/terms" style={{ color: "var(--ink-dim)" }}>Terms</a>
      </footer>
    </main>
  );
}

function StationLabel({ color, delay, children }: { color: string; delay: number; children: React.ReactNode }) {
  return (
    <span style={{ fontFamily: "var(--mono)", fontSize: 12, fontWeight: 700, color: "var(--ink-dim)", borderBottom: "3px solid transparent", paddingBottom: 6, whiteSpace: "nowrap", animation: `dialGlow 4.2s ease-in-out ${delay}s infinite` }}>
      <span style={{ color }}>{children}</span>
    </span>
  );
}

function StepCard({ num, color, title, text }: { num: string; color: string; title: string; text: string }) {
  return (
    <div className="hover-lift" style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: "26px 22px" }}>
      <div style={{ fontFamily: "var(--mono)", fontSize: 28, fontWeight: 700, color, marginBottom: 14, opacity: 0.7 }}>{num}</div>
      <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px" }}>{title}</h3>
      <p style={{ color: "var(--ink-dim)", fontSize: 14, lineHeight: 1.6, margin: 0 }}>{text}</p>
    </div>
  );
}

function FeatureCard({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="hover-lift" style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, padding: "22px 20px" }}>
      <div style={{ fontSize: 28, marginBottom: 12 }}>{icon}</div>
      <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 6px" }}>{title}</h3>
      <p style={{ color: "var(--ink-dim)", fontSize: 14, lineHeight: 1.6, margin: 0 }}>{text}</p>
    </div>
  );
}

function PriceCard({ name, price, cap, note, cta, href, highlight }: { name: string; price: string; cap: string; note: string; cta: string; href: string; highlight?: boolean }) {
  return (
    <div className="hover-lift" style={{ background: "var(--surface)", border: `1px solid ${highlight ? "var(--amber)" : "var(--line)"}`, borderRadius: 14, padding: "26px 22px", textAlign: "center", animation: highlight ? "glowPulse 3.5s ease-in-out infinite" : "none" }}>
      <div style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.15em", color: highlight ? "var(--amber)" : "var(--ink-dim)", marginBottom: 10 }}>{name.toUpperCase()}</div>
      <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 4 }}>{price}<span style={{ fontSize: 14, fontWeight: 500, color: "var(--ink-dim)" }}>/mo</span></div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>{cap}</div>
      <div style={{ fontSize: 12, color: "var(--ink-dim)", marginBottom: 18 }}>{note}</div>
      <a href={href} className={highlight ? "btn-amber" : "btn-ghost"} style={{ display: "block", padding: "10px 16px", borderRadius: 999, fontWeight: 700, fontSize: 14, textDecoration: "none", background: highlight ? "var(--amber)" : "transparent", color: highlight ? "#1b1b1f" : "var(--ink)", border: highlight ? "none" : "1px solid var(--line)" }}>
        {cta}
      </a>
    </div>
  );
}
