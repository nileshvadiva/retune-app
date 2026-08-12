import { MetadataRoute } from "next";

// Next.js automatically serves this at /sitemap.xml — no extra config
// needed. Just list every public page you want Google to know about.
// Auth-gated pages (dashboard, etc.) are intentionally left out since
// Google can't/shouldn't index content that requires login.
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://retuneai.in";

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/signup`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}