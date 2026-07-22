import type { MetadataRoute } from "next";

// Auto-serves at /sitemap.xml. Place this file at app/sitemap.ts.
// I only know about the homepage from what you've shared so far — add one
// entry per real route as you build them (e.g. /manifesto, /about, /waitlist).
export default function sitemap(): MetadataRoute.Sitemap {
  const SITE_URL = "https://joinstratum.app";

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    // { url: `${SITE_URL}/manifesto`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  ];
}
