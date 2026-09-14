// Uses the community-maintained "disposable-email-domains" package
// (100,000+ known disposable domains, regularly updated) instead of a
// small hardcoded list. A hardcoded list of ~80 domains will always miss
// new/less-common temp-mail services (this is exactly how crybio.com got
// through) — a maintained list closes that gap far better, though no list
// can ever be 100% complete since new disposable services launch constantly.
import disposableDomains from "disposable-email-domains";

const DISPOSABLE_EMAIL_DOMAINS = new Set(disposableDomains.map((d) => d.toLowerCase()));

// Supplementary list for domains caught "in the wild" that the maintained
// package above doesn't (yet) include. No static list — however large —
// will ever be complete, since new disposable-email services launch
// constantly. When a new one gets through, add it here; it takes effect
// immediately without waiting on an upstream package update.
const EXTRA_DISPOSABLE_DOMAINS = new Set<string>([
  "yzcalo.com", // confirmed disposable, missed by the "disposable-email-domains" package (Sept 2026)
]);

// If the maintained list ever flags a real provider you want to allow,
// add it here rather than forking the whole package.
const ALLOWLIST_OVERRIDES = new Set<string>([
  // "example.com",
]);

export function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase().trim();
  if (!domain) return false;
  if (ALLOWLIST_OVERRIDES.has(domain)) return false;
  return DISPOSABLE_EMAIL_DOMAINS.has(domain) || EXTRA_DISPOSABLE_DOMAINS.has(domain);
}