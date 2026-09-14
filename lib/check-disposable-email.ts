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
export async function isDisposableEmailLive(email: string): Promise<boolean> {
  const domain = email.split("@")[1]?.toLowerCase().trim();
  if (!domain) return false;

  // Check the local list FIRST, unconditionally. This is what makes manual
  // additions (like hebase.com) actually take effect — previously this
  // list was only consulted when the Disify call itself failed, so a
  // domain we'd manually blocked but Disify considered "clean" slipped
  // through anyway, because Disify's successful (if wrong) answer was
  // returned before the local list was ever reached.
  if (isKnownDisposableLocally(email)) return true;

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
    // Disify itself failed/timed out. We already checked the local list
    // above and it didn't match, so there's nothing further to fall back
    // to — fail open (allow the signup) rather than blocking everyone
    // because a third-party API had a bad moment.
    console.error("Disify check failed:", err);
    return false;
  }
}