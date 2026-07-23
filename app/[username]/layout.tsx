import type { Metadata } from "next";

// Applies to every /[username] page automatically. These are private,
// gated dashboards (matches, waitlist position, invite code) — they
// should never be indexed or shown as a search result, even though the
// rest of the site is fully open to crawlers.
//
// This file is a NESTED layout, not the root layout. It must NOT import
// globals.css, load fonts, or render <html>/<body> — app/layout.tsx
// already does all of that, and duplicating it here is what was
// breaking your build (globals.css doesn't exist relative to this
// folder, and nested <html>/<body> tags are invalid HTML).
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function UsernameLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}