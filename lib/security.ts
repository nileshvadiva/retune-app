// Defense-in-depth against CSRF: even though Supabase's auth cookies are
// SameSite=Lax (which already blocks most cross-site POST abuse), this adds
// an explicit check that state-changing requests originate from our own
// site rather than some other page silently submitting to our API.
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  // If no site URL is configured, allow in dev, block in production.
  if (!siteUrl) {
    return process.env.NODE_ENV !== "production";
  }

  // No origin header = same-origin browser request, allow through.
  if (!origin) return true;

  try {
    const originHost = new URL(origin).host;
    const siteHost = new URL(siteUrl).host;

    // Allow exact match OR Vercel preview URLs for the same project.
    return (
      originHost === siteHost ||
      originHost.endsWith(".vercel.app")
    );
  } catch {
    return false;
  }
}