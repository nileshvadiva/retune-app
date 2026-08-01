// Accepts any Headers-like object — works with both a Request's .headers
// (in API routes) and next/headers' headers() (in Server Components).
export function getClientIp(requestHeaders: { get(name: string): string | null }): string {
  const forwardedFor = requestHeaders.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  const realIp = requestHeaders.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}
