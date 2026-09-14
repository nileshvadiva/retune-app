# Retune — production setup

Real auth (Supabase), real database (Postgres), real payments (Stripe).
The Anthropic API key stays server-side — it is never exposed to the browser.

## 1. Supabase

1. Create a project at supabase.com
2. Go to **SQL Editor**, paste the contents of `supabase/schema.sql`, run it
3. Go to **Authentication → Providers**, enable **Email** and **Google**
4. Go to **Project Settings → API**, copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret — server only)

## 2. Anthropic

Get an API key from console.anthropic.com → `ANTHROPIC_API_KEY`

## 3. Stripe

1. Create an account at dashboard.stripe.com
2. Go to **Product catalog**, create THREE products with recurring monthly prices:
   - "Retune Starter" — $19/month → copy its **Price ID** → `STRIPE_PRICE_STARTER`
   - "Retune Pro" — $39/month → copy its **Price ID** → `STRIPE_PRICE_PRO`
   - "Retune Ultra" — $59/month → copy its **Price ID** → `STRIPE_PRICE_ULTRA`
3. Go to **Developers → API keys** → copy the secret key → `STRIPE_SECRET_KEY`
   (use the test key while developing, switch to the live key at launch)
4. Go to **Developers → Webhooks**, add an endpoint pointing to:
   `https://yourapp.com/api/stripe/webhook`
   Listen for: `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`, `invoice.paid`, `charge.dispute.created`
   (`invoice.paid` is what resets each user's generation count every renewal —
   don't skip it, or paid users will get stuck at 0 tunes left forever after
   month one)
   Copy the **Signing secret** → `STRIPE_WEBHOOK_SECRET`

Note on international customers: Stripe Checkout automatically shows the
right currency/payment methods per customer, no per-country setup needed.
Expect Stripe's own processing + cross-border + FX fees to apply on top of
your price — budget roughly 5-7% depending on your account's country and
where your customers are paying from.

## 4. Cloudflare Turnstile (CAPTCHA)

This closes the gap where someone could call Supabase's public signup API
directly, bypassing our app entirely.

1. Go to dash.cloudflare.com → Turnstile → add a site, get a **Site Key**
   and **Secret Key**
2. Put the Site Key in `.env.local` as `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
3. In your **Supabase dashboard** → Authentication → Settings → find
   "Enable CAPTCHA protection", turn it on, choose **Turnstile**, and paste
   in the **Secret Key** (not the site key — the secret one)

With this on, Supabase itself rejects signup/signin attempts without a
valid Turnstile token — that protection exists at Supabase's layer, not
just in our app code, so it can't be bypassed by skipping our frontend.

## 5. Local development

```bash
npm install
cp .env.example .env.local   # fill in all the values above
npm run dev
```

Visit http://localhost:3000 — you'll be redirected to `/signup`.

## 6. Deploy

1. Push this project to a GitHub repo
2. Go to vercel.com → New Project → import the repo
3. Add every variable from `.env.example` in Vercel's Environment Variables
   settings (use your **live** Stripe key here, not the test key)
4. Deploy. Update `NEXT_PUBLIC_SITE_URL` to your real domain and redeploy
5. Update your Stripe webhook endpoint URL to the live domain

## Security — what's implemented

- **Secrets never reach the browser.** Anthropic and Stripe secret keys, and
  the Supabase service role key, are only ever read in server-side code
  (API routes). The browser only ever sees the public anon key.
- **`.gitignore` excludes `.env*` files.** Never remove this — committing
  `.env.local` to GitHub would leak every key you have to the public.
- **Row Level Security (RLS)** on every table — a user's queries can only
  ever touch their own rows, enforced by Postgres itself, not just app code.
- **Stripe webhook signature verification** — plan upgrades only happen when
  Stripe cryptographically signs the event; the browser can never claim
  "I paid" and get upgraded for free.
- **Monthly generation caps per plan**, enforced server-side (not just
  hidden in the UI) — Free/Starter/Pro all have a hard ceiling so no single
  user's API usage can exceed what they're paying you.
- **A 40,000-character input cap** bounds the worst-case API cost of any
  single request.
- **Burst rate limiting** (`lib/rate-limit.ts`) — max 8 requests/minute per
  user, independent of the monthly cap, so a script or accidental double-
  click storm can't hammer the Anthropic API.
- **Origin checking** (`lib/security.ts`) on all state-changing routes as
  defense-in-depth against CSRF, on top of Supabase's SameSite cookies.
- **Security headers** (`next.config.js`) — clickjacking protection, MIME-
  sniffing protection, HTTPS enforcement, restricted browser permissions.
- **IP-based signup limiting** — max 3 accounts per IP per 24 hours,
  covering BOTH signup paths:
  - Email/password → checked in `app/api/auth/signup/route.ts`, before the
    account is created.
  - Google OAuth → these bypass that route entirely (they talk to Supabase
    directly), so `app/dashboard/page.tsx` does a one-time fallback check
    on first login. If it fails, the account isn't deleted — it's simply
    given zero free tunes instead of 3, so the existing paywall handles it.
- **CAPTCHA (Cloudflare Turnstile)**, enforced by Supabase itself at the
  auth layer — this is what stops someone from calling Supabase's public
  signup endpoint directly and skipping our app (and its IP check)
  entirely. See setup step 4 above; this only protects the email/password
  path, same as most CAPTCHA implementations — it does not apply to
  OAuth sign-in.
- **Safe JSON parsing** — malformed request bodies return a clean 400
  instead of crashing the route or leaking a stack trace.

## Worth adding as you grow (not included yet)

- **Uptime monitoring** — UptimeRobot or Better Uptime (free tiers) pinging
  your site every few minutes, alerting you by email/SMS if it goes down.
- **Error tracking** — Sentry's free tier catches and alerts on runtime
  errors in production that would otherwise only show up in Vercel logs.
- **Spend limits** — set a monthly spend cap in your Anthropic console;
  Stripe's own Radar fraud rules are already on by default. No code needed
  for either, just check the dashboards periodically.
- **Automatic backups** — Supabase's free tier has limited backup history;
  upgrade to a paid Supabase plan once revenue justifies it, and actually
  test a restore once so you know the process works before you need it.
- **Distributed rate limiting** (e.g. Upstash Redis) if you deploy across
  many serverless regions — the current Supabase-based limiter works per
  user account, which covers the realistic abuse case for this app, but a
  Redis-based limiter is faster at very high scale.
- **2FA for your own Supabase/Stripe/Vercel/GitHub accounts** — the app can
  be perfectly secure and still get compromised if your own admin accounts
  aren't protected. Also turn on Dependabot alerts in your GitHub repo
  settings (Settings → Security) — the config file is there, but private
  repos need alerts enabled manually once.

## What's real here vs. the earlier prototype

- Login/signup are real Supabase Auth — works across devices
- History and usage count live in Postgres, not the browser
- Three real tiers, each with a hard cap, enforced server-side:
  - **Free** — 3 tunes **for life** (never resets — this is deliberate, so
    the same person can't just make endless new accounts to keep getting
    free tunes forever)
  - **Starter** — $19/month, 50 tunes/month (Sonnet)
  - **Pro** — $39/month, 100 tunes/month (Sonnet)
  - **Ultra** — $59/month, 150 tunes/month, routed to **Claude Opus** instead
    of Sonnet — this is the actual product difference customers are paying
    for on this tier, not just a bigger number
  (No paid plan is unlimited either — an unbounded plan means one heavy
  user's API bill could exceed what they pay you)
- A 40,000-character (~6,000-7,000 word) limit per submission keeps any
  single generation's API cost bounded to roughly $0.05 max
- Upgrading goes through actual Stripe Checkout; a user only gets bumped to
  a paid plan when Stripe's webhook confirms a real payment — never based on
  anything the browser claims
- `invoice.paid` resets everyone's usage counter each billing cycle
- The Anthropic API key is never sent to the browser
