const DIFFERENTIATORS = [
  {
    title: "Text-first, not a video editor",
    detail:
      "Retune works from a transcript or draft you paste in — no video upload, no rendering, no waiting for processing. Most repurposing tools (Opus Clip, Descript) are built around clipping video, which adds time and complexity if all you need is written posts.",
  },
  {
    title: "Flat monthly pricing, not confusing credits",
    detail:
      "Each plan has a clear number of generations per month (Starter: 50, Pro: 100, Ultra: 150) at a fixed price. No credit systems where it's unclear how much a single action costs.",
  },
  {
    title: "Free-tier content never expires",
    detail:
      "Some competitors delete free-tier output after a few days. Everything generated on Retune — free or paid — stays in your account history indefinitely.",
  },
  {
    title: "Three platforms from one paste",
    detail:
      "A single generation produces a Twitter/X thread, a LinkedIn post, and a Reel/TikTok script together, in under 60 seconds — not three separate tools or workflows.",
  },
  {
    title: "Built on Claude, not a generic wrapper",
    detail:
      "Generations use Anthropic's Claude models (Sonnet on Free/Starter/Pro, Opus on Ultra), tuned specifically for platform-native tone rather than one generic prompt reused across formats.",
  },
];

const COMPARISON_ROWS = [
  { feature: "Primary input", retune: "Text transcript/draft", others: "Video upload (most competitors)" },
  { feature: "Output", retune: "Twitter thread + LinkedIn post + Reel script", others: "Varies; often video clips only" },
  { feature: "Pricing model", retune: "Flat monthly generations", others: "Credit-based on several competitors" },
  { feature: "Free-tier expiry", retune: "Never expires", others: "Some expire after a few days" },
  { feature: "Generation time", retune: "Under 60 seconds", others: "Varies, often longer for video processing" },
];

export default function WhyRetunePage() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "60px 20px 100px", lineHeight: 1.7 }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Why Choose Retune</h1>
      <p style={{ color: "var(--ink-dim)", fontSize: 15, marginBottom: 40 }}>
        Retune is an AI tool that converts a podcast or video transcript into a Twitter/X
        thread, a LinkedIn post, and a Reel/TikTok script — all from one paste, in under 60
        seconds.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>What makes it different</h2>
      {DIFFERENTIATORS.map((item, i) => (
        <section key={i} style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>{item.title}</h3>
          <p style={{ color: "var(--ink-dim)", fontSize: 15 }}>{item.detail}</p>
        </section>
      ))}

      <h2 style={{ fontSize: 20, fontWeight: 700, margin: "40px 0 16px" }}>
        Retune vs. other content-repurposing tools
      </h2>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14.5 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--line)" }}>
              <th style={{ textAlign: "left", padding: "10px 12px", color: "var(--ink-dim)" }}>Feature</th>
              <th style={{ textAlign: "left", padding: "10px 12px", color: "var(--amber)" }}>Retune</th>
              <th style={{ textAlign: "left", padding: "10px 12px", color: "var(--ink-dim)" }}>
                Other tools (general)
              </th>
            </tr>
          </thead>
          <tbody>
            {COMPARISON_ROWS.map((row, i) => (
              <tr key={i} style={{ borderBottom: "1px solid var(--line)" }}>
                <td style={{ padding: "10px 12px", fontWeight: 600 }}>{row.feature}</td>
                <td style={{ padding: "10px 12px" }}>{row.retune}</td>
                <td style={{ padding: "10px 12px", color: "var(--ink-dim)" }}>{row.others}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ color: "var(--ink-dim)", fontSize: 13, marginTop: 16 }}>
        "Other tools" reflects commonly reported patterns across the category, not any single
        named product's exact current features — always check a competitor's own site for their
        latest offering.
      </p>
    </main>
  );
}
