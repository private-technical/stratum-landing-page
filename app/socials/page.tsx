import Link from "next/link";
import { Poppins } from "next/font/google";
import Navbar from "@/components/navbar";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

/* ------------------------------------------------------------------ */
/*  Fluid sizing — same approach as the navbar: interpolate smoothly    */
/*  between the original two states (48px / 32px gap below md, 80px /   */
/*  48px gap at and above it) instead of snapping at exactly 768px, so  */
/*  this page's type scale matches the rest of the site instead of      */
/*  being its own one-off breakpoint jump.                              */
/* ------------------------------------------------------------------ */
const VIEWPORT_MIN = 375;
const VIEWPORT_MAX = 768;

function fluid(min: number, max: number): string {
  const slope = (max - min) / (VIEWPORT_MAX - VIEWPORT_MIN);
  const coefficient = slope * 100;
  const intercept = min - slope * VIEWPORT_MIN;
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  const sign = coefficient < 0 ? "-" : "+";
  return `clamp(${lo.toFixed(2)}px, calc(${intercept.toFixed(2)}px ${sign} ${Math.abs(
    coefficient
  ).toFixed(2)}vw), ${hi.toFixed(2)}px)`;
}

const LINK_TEXT_SIZE = fluid(48, 80);
const LIST_GAP = fluid(32, 48);

const SOCIAL_LINKS = [
  { name: "Instagram", href: "https://www.instagram.com/joinstratum" },
  { name: "TikTok", href: "https://www.tiktok.com/@joinstratum.app" },
  { name: "X", href: "https://twitter.com/joinstratum" },
  { name: "Email", href: "mailto:hello@joinstratum.app" },
];

export default function SocialsPage() {
  return (
    <main
      className={`relative flex min-h-[100dvh] w-full flex-col bg-black text-white ${poppins.className}`}
    >
      {/* 
        Imported Navbar 
        Passing backgroundTheme="dark" ensures the logo is white and text is white
      */}
      <Navbar backgroundTheme="dark" />

      {/* 
        Minimalist Centered Content 
        Horizontal padding respects the safe area on notched phones in
        landscape, where env(safe-area-inset-*) can exceed the base 24px.
      */}
      <section
        className="flex flex-1 flex-col items-center justify-center text-center"
        style={{
          paddingLeft: "max(1.5rem, env(safe-area-inset-left))",
          paddingRight: "max(1.5rem, env(safe-area-inset-right))",
        }}
      >
        <ul className="flex flex-col" style={{ gap: LIST_GAP }}>
          {SOCIAL_LINKS.map((social) => (
            <li key={social.name}>
              <Link
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                // hover:opacity only ever reaches touch devices via a
                // simulated, easy-to-miss :hover-after-tap — active:
                // gives an immediate press response that actually shows
                // up on a phone, and focus-visible keeps the link
                // legible for keyboard navigation instead of relying on
                // the browser's default outline against a black page.
                className="inline-block rounded-sm font-medium leading-none tracking-[-0.03em] transition-opacity duration-300 hover:opacity-50 active:opacity-40 focus-visible:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-white/40"
                style={{ fontSize: LINK_TEXT_SIZE }}
              >
                {social.name}
              </Link>
            </li>
          ))}
        </ul>

        {/* Optional subtle footer note for aesthetics. Anchored with its
            own safe-area padding rather than a fixed bottom-12, so it
            clears the home-indicator strip on notched phones instead of
            sitting flush against it. */}
        <p
          className="absolute left-0 right-0 text-center text-[14px] font-medium tracking-[-0.02em] text-white/30"
          style={{ bottom: "max(3rem, calc(1.5rem + env(safe-area-inset-bottom)))" }}
        >
          hello@joinstratum.app
        </p>
      </section>
    </main>
  );
}