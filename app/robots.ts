import type { MetadataRoute } from "next";

// Auto-serves at /robots.txt. Place this file at app/robots.ts.
//
// Note: we deliberately do NOT try to disallow /[username] paths here.
// Google explicitly advises against combining robots.txt disallow with
// meta noindex — if a path is disallowed, crawlers can't even see the
// noindex tag, which can backfire and leave a bare URL indexed with no
// description. The correct fix for those private pages is the noindex
// directive in app/[username]/layout.tsx, not a robots.txt rule.
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