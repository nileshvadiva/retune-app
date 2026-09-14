/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Security headers applied to every response. These protect against
  // clickjacking, MIME-sniffing attacks, and leaking referrer data —
  // standard hardening for any production web app.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" }, // stops your site being embedded in a hidden <iframe> for clickjacking
          { key: "X-Content-Type-Options", value: "nosniff" }, // stops the browser guessing file types in a way attackers can abuse
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }, // limits how much of your URL leaks to other sites
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }, // this app needs none of these, so block them outright
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }, // forces HTTPS once deployed
          {
            key: "Content-Security-Policy",
            // Only our own origin, plus Supabase (auth/data), Cloudflare
            // Turnstile (captcha), and Dodo Payments (checkout) can be
            // talked to from the browser. Restricts where scripts can
            // load from and blocks the page from ever being framed by
            // another site.
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com", // Next.js needs unsafe-inline/eval for hydration; Cloudflare needed for Turnstile widget
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data:",
              // Turnstile renders its challenge in a hidden iframe from this origin.
              // checkout.dodopayments.com added here too — needed ONLY if you ever
              // switch to Dodo's Overlay/Inline Checkout (modal popup). The current
              // redirect-based checkout (window.location.href = checkout_url) is a
              // full-page navigation and doesn't actually require this, but it's
              // harmless to allow now so you don't have to remember it later.
              "frame-src https://challenges.cloudflare.com https://checkout.dodopayments.com",
              "connect-src 'self' https://*.supabase.co https://challenges.cloudflare.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              // Was https://checkout.stripe.com (dead, Stripe is no longer used).
              // Replaced with Dodo's checkout domain — needed if the checkout
              // redirect is ever done via an actual <form> submit rather than
              // a JS window.location redirect.
              "form-action 'self' https://checkout.dodopayments.com",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;