import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/security";

// Monthly generation cap per plan. Even "ultra" is intentionally NOT
// unlimited — an unbounded plan means one heavy user's API bill could
// exceed what they pay, see the cost breakdown discussed earlier. These
// caps keep worst-case cost per user bounded and predictable.
const LIMITS: Record<string, number> = {
  free: 3,
  starter: 50,
  pro: 100,
  ultra: 150,
};

// Ultra is the only plan that gets routed to the more capable (and more
// expensive) Opus model — this is the actual product difference customers
// are paying $59 for. Every other plan uses Sonnet.
// NOTE: check console.anthropic.com for the current Opus model string
// before deploying — model IDs get superseded over time.
const MODEL_BY_PLAN: Record<string, string> = {
  free: "claude-sonnet-4-6",
  starter: "claude-sonnet-4-6",
  pro: "claude-sonnet-4-6",
  ultra: "claude-opus-4-6",
};
// Caps the input size so a single generation's API cost stays predictable
// (~$0.05 max per tune). Roughly 6,000-7,000 words of English text.
const MAX_CHARS = 40000;

// This route is the ONLY place that talks to the Anthropic API.
// The API key never touches the browser — that is non-negotiable for
// a production app, since anyone could otherwise steal your key and
// rack up charges on your account.
export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  let body: { text?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }
  const { text } = body;
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json({ error: "No source content provided." }, { status: 400 });
  }
  if (text.length > MAX_CHARS) {
    return NextResponse.json(
      {
        error: `That's too long (${text.length.toLocaleString()} characters). Keep it under ${MAX_CHARS.toLocaleString()} characters (~6,000-7,000 words) — try pasting one episode or chapter at a time.`,
      },
      { status: 413 }
    );
  }

  // Burst protection — catches scripted/bot abuse even from a legitimate,
  // paying account, before it ever reaches the Anthropic API.
  const rateCheck = await checkRateLimit(supabase, user.id);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Too many requests — please wait a minute and try again." },
      { status: 429 }
    );
  }

  // Load the user's current plan + usage before spending any API credits.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("plan, generations_used")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Could not load your profile." }, { status: 500 });
  }

  // NOTE: for "free", this is a LIFETIME cap by design — generations_used
  // is only ever reset by the invoice.paid webhook, which fires for paid
  // subscriptions only. A free account's counter never resets, which is
  // intentional: it stops someone from getting 3 free tunes every single
  // day/month forever without ever paying.
  const limit = LIMITS[profile.plan] ?? LIMITS.free;
  if (profile.generations_used >= limit) {
    return NextResponse.json(
      {
        error:
          profile.plan === "free"
            ? "You've used all 3 free tunes (lifetime limit). Upgrade to keep going."
            : `You've hit your ${profile.plan} plan's ${limit} tunes this month. It resets on your next billing date.`,
        limitReached: true,
      },
      { status: 402 }
    );
  }

  const prompt = `You are a social media repurposing engine. Given the raw source content below, produce platform-native derivatives.

Return ONLY valid JSON, no markdown fences, no preamble, matching exactly this shape:
{
  "twitter": ["tweet 1 text", "tweet 2 text", "up to 6 tweets total"],
  "linkedin": "a single linkedin post, 3-6 short paragraphs, professional but personal tone",
  "reel": {
    "hook": "a punchy 1-line opening hook for the first 2 seconds",
    "scenes": [
      {"time": "0-3s", "text": "what to show/say"},
      {"time": "3-10s", "text": "what to show/say"},
      {"time": "10-20s", "text": "what to show/say"},
      {"time": "20-30s", "text": "closing line / CTA"}
    ]
  }
}

Rules:
- Twitter thread: hook tweet first, punchy, no hashtag spam, 4-6 tweets.
- LinkedIn post: no hashtag spam, write like a founder sharing a real insight.
- Reel script: written for someone talking to camera, casual spoken tone.
- Base everything strictly on the source content's actual points, don't invent facts.

SOURCE CONTENT:
"""${text}"""`;

  let parsed;
  try {
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL_BY_PLAN[profile.plan] ?? MODEL_BY_PLAN.free,
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!anthropicRes.ok) {
      throw new Error(`Anthropic API error: ${anthropicRes.status}`);
    }

    const data = await anthropicRes.json();
    const raw = data.content.map((b: any) => b.text || "").join("\n").trim();
    const cleaned = raw.replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
    parsed = JSON.parse(cleaned);
  } catch (err) {
    console.error("Generation failed:", err);
    return NextResponse.json({ error: "Generation failed. Please try again." }, { status: 502 });
  }

  // Save to history and bump usage count — both scoped to this user only
  // thanks to Row Level Security policies on the tables.
  const snippet = text.trim().slice(0, 60).replace(/\s+/g, " ") + (text.length > 60 ? "…" : "");

  await supabase.from("history").insert({
    user_id: user.id,
    source_snippet: snippet,
    output: parsed,
  });

  await supabase.rpc("increment_generation_usage", { p_user_id: user.id });

  return NextResponse.json({ data: parsed });
}
