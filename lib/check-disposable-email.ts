import { isDisposableEmail as isKnownDisposableLocally } from "./disposable-email-domains";

const DISIFY_TIMEOUT_MS = 3000;

// Disify (https://disify.com) is a free, keyless API backed by a much
// larger and more current disposable-domain database than any static list
// we maintain ourselves — it's the reason yzcalo.com and airhemp.com kept
// slipping through. We check it live at signup time.
//
// If Disify is slow, down, or returns something unexpected, we deliberately
// fall back to our own local list (disposable-email-domains.ts) rather than
// either failing closed (blocking every signup because a third party had a
// bad moment) or failing fully open (letting every disposable email through
// during that window). The local list is smaller, but it's instant and has
// zero external dependency, so it's the right fallback for the few minutes
// a real outage might last.
import { promises as dns } from "dns";
import { isDisposableEmail as isKnownDisposableLocally } from "./disposable-email-domains";

const DISIFY_TIMEOUT_MS = 3000;
const MX_LOOKUP_TIMEOUT_MS = 2000;

// Many brand-new "front" domains (random-looking, freshly registered —
// exactly what a temp-mail generator spins up) actually route mail through
// the SAME backend mail server as an already-known disposable provider.
// Resolving the domain's MX record and checking THAT hostname against our
// existing lists catches this case, without needing any new external MX
// blacklist database (no reliable free/maintained one exists — this reuses
// the domain lists we already have, just checked against a different
// hostname than the one in the email address).
//
// This is a supplementary signal, not a primary gate: DNS lookups can be
// slow or fail for unrelated reasons, so a failure here never blocks
// signup — it just means this particular check found nothing.
async function hasKnownDisposableMx(domain: string): Promise<boolean> {
  try {
    const lookup = dns.resolveMx(domain);
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("MX lookup timed out")), MX_LOOKUP_TIMEOUT_MS)
    );
    const records = await Promise.race([lookup, timeout]);

    for (const record of records) {
      const mxHost = record.exchange.toLowerCase();
      const parts = mxHost.split(".");
      const mxBaseDomain = parts.slice(-2).join("."); // e.g. "mx1.guerrillamail.com" -> "guerrillamail.com"
      if (isKnownDisposableLocally(`x@${mxHost}`) || isKnownDisposableLocally(`x@${mxBaseDomain}`)) {
        return true;
      }
    }
    return false;
  } catch (err) {
    // No MX record, DNS failure, or timeout — don't treat this as a
    // signal either way, just move on to the next check.
    console.error("MX lookup failed or found nothing:", err);
    return false;
  }
}

export async function isDisposableEmailLive(email: string): Promise<boolean> {
  const domain = email.split("@")[1]?.toLowerCase().trim();
  if (!domain) return false;

  // Layer 1: local list, unconditionally. Catches everything we've
  // manually confirmed, regardless of what other checks say.
  if (isKnownDisposableLocally(email)) return true;

  // Layer 2: MX-record heuristic. Catches brand-new front domains that
  // route through an already-known disposable provider's mail server.
  if (await hasKnownDisposableMx(domain)) return true;

  // Layer 3: Disify's live database (~30k domains).
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DISIFY_TIMEOUT_MS);

    const res = await fetch(`https://disify.com/api/email/${encodeURIComponent(email)}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`Disify returned HTTP ${res.status}`);
    }

    const data: { disposable?: boolean } = await res.json();
    if (typeof data.disposable !== "boolean") {
      throw new Error("Unexpected Disify response shape");
    }

    return data.disposable;
  } catch (err) {
    // Disify itself failed/timed out, and layers 1-2 already found nothing.
    // Fail open (allow the signup) rather than blocking everyone because a
    // third-party API had a bad moment.
    console.error("Disify check failed:", err);
    return false;
  }
}