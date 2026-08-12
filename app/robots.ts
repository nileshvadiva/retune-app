import { MetadataRoute } from "next";

// Next.js automatically serves this at /robots.txt — no extra config
// needed. Blocks crawlers from indexing auth-gated pages and API routes,
// which shouldn't show up in search results anyway.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/api/"],
    },
    sitemap: "https://retuneai.in/sitemap.xml",
  };
}