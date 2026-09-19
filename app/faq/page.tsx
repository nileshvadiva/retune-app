const FAQS = [
  {
    q: "What is Retune?",
    a: "Retune is an AI tool that converts a podcast or video transcript into platform-native social media posts — a Twitter/X thread, a LinkedIn post, and a short-form Reel/TikTok script — all generated from one paste, in under 60 seconds.",
  },
  {
    q: "How is Retune different from Opus Clip, Podsqueeze, or Descript?",
    a: "Those tools mainly focus on video clipping and editing. Retune is text-first: paste a transcript or draft, and it outputs ready-to-post written content for three platforms at once, with no video editing required. It also has no credit-based pricing and free-tier content never expires.",
  },
  {
    q: "Is there a free plan?",
    a: "Yes. The Free plan includes 3 generations for the lifetime of your account, with no credit card required to sign up.",
  },
  {
    q: "What platforms does Retune generate content for?",
    a: "Twitter/X (a 4-6 tweet thread), LinkedIn (a single professional post), and a short-form Reel/TikTok script with scene-by-scene timing.",
  },
  {
    q: "How long does a generation take?",
    a: "Under 60 seconds from pasting your source content to receiving all three outputs.",
  },
  {
    q: "Does generated content expire?",
    a: "No. Unlike some competitors whose free-tier content expires after a few days, everything you generate on Retune stays in your account history indefinitely.",
  },
  {
    q: "What AI model powers Retune?",
    a: "Retune uses Anthropic's Claude models — Claude Sonnet for Free, Starter, and Pro plans, and Claude Opus for the Ultra plan.",
  },
  {
    q: "How much does Retune cost?",
    a: "Free ($0, 3 lifetime generations), Starter ($19/month, 50 generations), Pro ($39/month, 100 generations), and Ultra ($59/month, 150 generations using Claude Opus).",
  },
  {
    q: "Is my content used to train AI models?",
    a: "No. Content sent through Anthropic's commercial API is not used to train their models.",
  },
];

export default function FaqPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  return (
    <main style={{ maxWidth: 680, margin: "0 auto", padding: "60px 20px 100px", lineHeight: 1.7 }}>
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Frequently Asked Questions</h1>
      <p style={{ color: "var(--ink-dim)", fontSize: 15, marginBottom: 40 }}>
        Everything you need to know about Retune.
      </p>

      {FAQS.map((item, i) => (
        <section key={i} style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{item.q}</h2>
          <p style={{ color: "var(--ink-dim)", fontSize: 15 }}>{item.a}</p>
        </section>
      ))}
    </main>
  );
}
