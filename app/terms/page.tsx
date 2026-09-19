export default function TermsPage() {
  return (
    <main style={{ maxWidth: 680, margin: "0 auto", padding: "60px 20px 100px", lineHeight: 1.7 }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Terms of Service</h1>
      <p style={{ color: "var(--ink-dim)", fontSize: 14, marginBottom: 40 }}>Last updated: 17/09/2026</p>

      <Section title="The service">
        <p>
          Retune ("we", "us") lets you turn transcripts and drafts into platform-specific
          social media posts using AI. By creating an account, you agree to these terms.
        </p>
      </Section>

      <Section title="Your account">
        <ul style={listStyle}>
          <li>You're responsible for keeping your login credentials secure.</li>
          <li>The free plan is limited to 3 generations for the lifetime of an account; creating multiple accounts to get around this limit is not allowed.</li>
          <li>You must be 18 or older, or the age of majority in your country, to use this service.</li>
        </ul>
      </Section>

      <Section title="Subscriptions & billing">
        <ul style={listStyle}>
          <li>Paid plans (Starter, Pro, Ultra) renew automatically each month until you cancel.</li>
          <li>You can cancel anytime from your account's billing management page; you'll retain access until the end of the current billing period.</li>
          <li>Fees already paid are non-refundable, except where required by law. This applies to all payments, not just partial billing periods.</li>
          <li>Prices may change with notice; continued use after a price change means you accept the new price.</li>
        </ul>
      </Section>

      <Section title="Acceptable use">
        <p>You agree not to:</p>
        <ul style={listStyle}>
          <li>Use the service to generate illegal, hateful, or harassing content.</li>
          <li>Attempt to bypass usage limits, rate limits, or account restrictions.</li>
          <li>Resell or provide bulk/automated access to the service without our written permission.</li>
          <li>Attempt to interfere with, disrupt, or reverse-engineer the service.</li>
        </ul>
      </Section>

      <Section title="Your content">
        <p>
          You own what you paste in and what's generated for you. We don't claim ownership over
          your content — we only process it to provide the service (see our Privacy Policy for
          how it's handled).
        </p>
      </Section>

      <Section title="No warranty">
        <p>
          The service is provided "as is." AI-generated content can be inaccurate or
          inappropriate for your specific use case — you're responsible for reviewing
          generated content before publishing it anywhere.
        </p>
      </Section>

      <Section title="Limitation of liability">
        <p>
          To the maximum extent permitted by law, we are not liable for indirect, incidental,
          or consequential damages arising from your use of the service. Our total liability
          for any claim is limited to the amount you paid us in the past 12 months.
        </p>
      </Section>

      <Section title="Termination">
        <p>
          We may suspend or terminate accounts that violate these terms, including confirmed
          payment fraud or chargebacks. You may close your account at any time.
        </p>
      </Section>

      <Section title="Governing law">
        <p>These terms are governed by the laws of INDIA.</p>
      </Section>

      <Section title="Contact">
        <p>Questions about these terms? Email retuneapp.support@gmail.com.</p>
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
