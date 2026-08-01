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
            // Only our own origin, plus Supabase (auth/data) and Stripe
            // (checkout redirect) can be talked to from the browser.
            // Restricts where scripts can load from and blocks the page
            // from ever being framed by another site.
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js needs these for hydration in dev/build output
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data:",
              "connect-src 'self' https://*.supabase.co",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self' https://checkout.stripe.com",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
