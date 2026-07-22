import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://joinstratum.app";
const SITE_NAME = "Stratum";
const TITLE =
  "Stratum — Rate Film, Music & Books. Find People Who Think Like You";
const DESCRIPTION =
  "Stratum is the social app for taste. Rate films, music, and books to build your taste profile, then get matched with people who rated the same things the same way — not followers, matches.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  category: "Social Networking",

  keywords: [
    "Stratum",
    "Stratum app",
    "taste profile app",
    "film rating app",
    "music rating app",
    "book rating app",
    "social app for taste",
    "find people with similar taste",
    "movie music book social network",
    "rate movies music books",
    "taste matching app",
  ],

  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  referrer: "origin-when-cross-origin",
  formatDetection: { email: false, address: false, telephone: false },

  alternates: {
    canonical: SITE_URL,
  },

  // Open Graph — controls how links look on iMessage, Discord, LinkedIn, etc.
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: TITLE,
    description: DESCRIPTION,
    locale: "en_US",
    images: [
      {
        url: "/blackBG_socials_banner.png",
        width: 1200,
        height: 630,
        alt: "Stratum — Taste is identity.",
      },
      {
        url: "/whiteBG_socials_banner.png",
        width: 1200,
        height: 630,
        alt: "Stratum — Taste is identity.",
      },
    ],
  },

  // Twitter/X card
  twitter: {
    card: "summary_large_image",
    site: "@joinstratum",
    creator: "@joinstratum",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/blackBG_socials_banner.png"],
  },

  // Favicons / tab icons — explicit because these live in /public under
  // custom names rather than Next's auto-detected file-convention names.
  icons: {
    icon: [
      { url: "/legendary_tab.ico", sizes: "any", type: "image/x-icon" },
      { url: "/standard_destop_tab.png", type: "image/png", sizes: "32x32" },
    ],
    shortcut: ["/legendary_tab.ico"],
    apple: [{ url: "/Android_High_Res_Web_App.png" }],
  },

  // Tell every crawler to index and follow, and let Google show full
  // rich previews (no snippet/image/video length caps).
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // Nothing needed here — Search Console is verified via DNS TXT record,
  // which doesn't require an HTML meta tag. The `verification.google`
  // field below only matters if you switch to the "HTML tag" method later.
  // Optional: Bing Webmaster Tools can import your Search Console property
  // directly (bing.com/webmasters → "Import from Google Search Console"),
  // no separate code needed there either.
  verification: {},

  other: {
    "apple-mobile-web-app-title": SITE_NAME,
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": "#000000",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
};

// JSON-LD structured data — this is what lets Google build a Knowledge
// Panel for "Stratum" and confidently link your X/Instagram/TikTok as the
// same entity, instead of guessing from search results alone.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/google_search_results.png`,
      email: "hello@joinstratum.app",
      sameAs: [
        "https://x.com/joinstratum",
        "https://www.instagram.com/joinstratum",
        "https://www.tiktok.com/@joinstratum.app",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased overscroll-none`}
    >
      <body className="min-h-full flex flex-col overscroll-none">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}