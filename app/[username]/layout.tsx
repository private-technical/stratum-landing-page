import type { Metadata } from "next";

// Applies to every /[username] page automatically. These are private,
// gated dashboards (matches, waitlist position, invite code) — they
// should never be indexed or shown as a search result, even though the
// rest of the site is fully open to crawlers.
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
