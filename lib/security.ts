// Defense-in-depth against CSRF: even though Supabase's auth cookies are
// SameSite=Lax (which already blocks most cross-site POST abuse), this adds
// an explicit check that state-changing requests originate from our own
// site rather than some other page silently submitting to our API.
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!siteUrl) {
    // In production, a missing site URL must NOT silently disable this
    // check — that would be a security downgrade nobody notices. Fail
    // closed instead. In local dev it's fine to allow through.
    return process.env.NODE_ENV !== "production";
  }
  if (!origin) return true; // some same-origin browser requests omit Origin; don't block those
  try {
    return new URL(origin).host === new URL(siteUrl).host;
  } catch {
    return false;
  }
}
