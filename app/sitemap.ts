import type { MetadataRoute } from "next";

// Auto-serves at /sitemap.xml. Place this file at app/sitemap.ts.
export default function sitemap(): MetadataRoute.Sitemap {
  const SITE_URL = "https://joinstratum.app";

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/platform`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/socials`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    // /[username] is deliberately left out. Each one is a private,
    // gated dashboard (matches, waitlist position, invite code) —
    // not marketing content, and not something that should ever be
    // searchable. See app/[username]/layout.tsx for the matching
    // noindex directive.
  ];
}