export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 680, margin: "0 auto", padding: "60px 20px 100px", lineHeight: 1.7 }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Privacy Policy</h1>
      <p style={{ color: "var(--ink-dim)", fontSize: 14, marginBottom: 40 }}>Last updated: 25/07/2026</p>

      <Section title="What we collect">
        <ul style={listStyle}>
          <li>Your email address and password (password is hashed by our authentication provider, Supabase — we never see or store it in plain text).</li>
          <li>The transcripts/text you paste in to generate posts, and the generated output (LinkedIn post, Twitter thread, Reel script) — saved to your account history so you can revisit past generations.</li>
          <li>Your IP address, held briefly, used only to prevent signup and free-tier abuse (e.g. the same person creating many accounts).</li>
          <li>Basic payment information — but not your card details. Card numbers go directly to Stripe, our payment processor; we only receive a confirmation that payment succeeded or failed.</li>
        </ul>
      </Section>

      <Section title="Who we share it with">
        <p>We don't sell your data. It's shared only with the services that make the product work:</p>
        <ul style={listStyle}>
          <li><strong>Supabase</strong> — hosts our database and handles login/authentication.</li>
          <li><strong>Anthropic</strong> — the text you paste in is sent to Anthropic's Claude API to generate your posts. See Anthropic's own privacy policy for how they handle API data.</li>
          <li><strong>Stripe</strong> — processes payments and stores your payment method securely; we never see full card numbers.</li>
          <li><strong>Cloudflare</strong> — verifies you're not a bot during signup (Turnstile), and may see basic request metadata to do so.</li>
        </ul>
      </Section>

      <Section title="How long we keep it, and how to delete it">
        <p>
          Your account data and generation history are kept as long as your account is active.
          Email retuneapp.support@gmail.com to have your account deleted — this removes your
          profile and generation history together, nothing lingers behind after that.
        </p>
      </Section>

      <Section title="How Anthropic handles your content">
        <p>
          We use Anthropic's commercial API (not the consumer Claude.ai product) to generate
          your posts. Under Anthropic's Commercial Terms, content sent through the API is not
          used to train their models. Anthropic's current API only offers US and "global"
          processing regions — if you need EU-only data processing for compliance reasons,
          check Anthropic's latest documentation, as this may change over time.
        </p>
      </Section>

      <Section title="Where your data is hosted">
        <p>
          Our database is hosted by Supabase and our app by Vercel, in the region we've
          configured for our project (ap-south-1). If you're
          in the EU/UK and your data is processed outside the EU/UK, this happens under
          Supabase's and Vercel's own standard contractual clauses (SCCs) for international
          transfers.
        </p>
      </Section>

      <Section title="Emails we send">
        <p>
          We send account-related emails (confirmation, password reset, billing receipts) —
          these aren't optional, they're needed to run your account. If we ever add product
          update or marketing emails, they'll include an unsubscribe link and won't be mixed
          with account-critical emails.
        </p>
      </Section>

      <Section title="Cookies">
        <p>
          We use one essential cookie to keep you logged in. We don't use tracking or
          advertising cookies.
        </p>
      </Section>

      <Section title="Your rights">
        <p>
          You can request a copy of your data, ask us to correct it, or ask us to delete it,
          at any time by emailing retuneapp.support@gmail.com. If you're in the EU/UK, this
          is your right under GDPR; other regions may have similar rights under local law.
        </p>
      </Section>

      <Section title="Children">
        <p>This service is not directed at children under 18, and we don't knowingly collect data from them.</p>
      </Section>

      <Section title="Changes to this policy">
        <p>
          If this policy changes materially, we'll update the date at the top of this page and,
          where required by law, notify you directly.
        </p>
      </Section>

      <Section title="Contact">
        <p>Questions about this policy? Email retuneapp.support@gmail.com.</p>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 19, fontWeight: 700, marginBottom: 10 }}>{title}</h2>
      <div style={{ color: "var(--ink-dim)", fontSize: 15 }}>{children}</div>
    </section>
  );
}

const listStyle: React.CSSProperties = { paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 };
