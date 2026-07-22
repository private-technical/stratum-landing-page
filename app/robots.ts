import type { MetadataRoute } from "next";

// Auto-serves at /robots.txt. Place this file at app/robots.ts.
export default function robots(): MetadataRoute.Robots {
  const SITE_URL = "https://joinstratum.app";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
