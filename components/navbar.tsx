"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type Theme = "dark" | "light";

/* ------------------------------------------------------------------ */
/*  Fluid sizing                                                       */
/*                                                                      */
/*  Two exact states — 24px/24px padding + a 20px/24px type scale       */
/*  below the md: breakpoint (768px), and 48px/32px padding + 28px      */
/*  type at and above it — interpolated smoothly instead of snapping   */
/*  at 768px. fluid() lands on the *same* original numbers at both      */
/*  ends, just without the jump in between. Doing the arithmetic in    */
/*  code (once, at module load) instead of hand-typing decimals into   */
/*  a template string removes an entire class of "mistyped a           */
/*  coefficient" bugs.                                                  */
/* ------------------------------------------------------------------ */
const NAV_VIEWPORT_MIN = 375;
const NAV_VIEWPORT_MAX = 768; // matches the original design's md: breakpoint

function fluid(min: number, max: number): string {
  const slope = (max - min) / (NAV_VIEWPORT_MAX - NAV_VIEWPORT_MIN);
  const coefficient = slope * 100;
  const intercept = min - slope * NAV_VIEWPORT_MIN;
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  const sign = coefficient < 0 ? "-" : "+";
  return `clamp(${lo.toFixed(2)}px, calc(${intercept.toFixed(2)}px ${sign} ${Math.abs(
    coefficient
  ).toFixed(2)}vw), ${hi.toFixed(2)}px)`;
}

// Computed once at module load, reused on every render.
const NAV_PADDING_X = fluid(20, 48);
const NAV_PADDING_Y = fluid(18, 32);
const NAV_GAP = fluid(12, 24);
const LOGO_GAP = fluid(0, 0);
const LOGO_TEXT_SIZE = fluid(20, 28);
const LINK_TEXT_SIZE = fluid(15, 17);

// Resolves ANY valid CSS color string (rgb, hsl, oklch, lab, color(),
// named colors, etc.) to concrete 0-255 RGBA by letting the browser's
// own canvas fill-style parser do the work, instead of hand-rolling a
// regex for one specific notation. A regex tied to rgb()/rgba() breaks
// the moment a computed color comes back in another format — oklch()
// in particular, which is increasingly what Tailwind's palette
// resolves to — and silently treats a perfectly solid background as
// "no background here," which is what was sending the theme detector
// all the way up to the black document root.
let swatchCtx: CanvasRenderingContext2D | null = null;
function toRGBA(colorStr: string): { r: number; g: number; b: number; a: number } | null {
  if (!colorStr || colorStr === "transparent") return null;
  if (!swatchCtx) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    swatchCtx = canvas.getContext("2d", { willReadFrequently: true });
  }
  if (!swatchCtx) return null;
  swatchCtx.fillStyle = "#000"; // known baseline
  swatchCtx.fillStyle = colorStr; // no-ops back to the baseline if colorStr can't be parsed
  swatchCtx.clearRect(0, 0, 1, 1);
  swatchCtx.fillRect(0, 0, 1, 1);
  const [r, g, b, a255] = swatchCtx.getImageData(0, 0, 1, 1).data;
  return { r, g, b, a: a255 / 255 };
}

function isLightColor({ r, g, b }: { r: number; g: number; b: number }) {
  // Perceptual brightness (0–1). Above the threshold reads as a light
  // surface that needs dark text/logo on top of it to stay readable.
  return (r * 299 + g * 587 + b * 114) / 1000 / 255 > 0.6;
}

/**
 * Figures out whether a specific point on screen is currently sitting
 * over a light or dark surface, purely from what's actually rendered
 * there — no per-section flag to maintain. Walks up from the topmost
 * non-navbar element at that point until it finds a real, solid-enough
 * background (>50% opacity, so a faint decorative tint can't flip the
 * theme on its own).
 */
function themeAtPoint(navEl: HTMLElement, x: number, y: number): Theme {
  const stack = document.elementsFromPoint(x, y);
  let el: Element | null = stack.find((node) => !navEl.contains(node)) ?? null;

  while (el) {
    const bg = toRGBA(getComputedStyle(el).backgroundColor);
    if (bg && bg.a > 0.5) {
      return isLightColor(bg) ? "light" : "dark";
    }
    el = el.parentElement;
  }
  return "dark"; // matches this app's default --color-bg
}

interface NavbarProps {
  /**
   * Optional manual override. Leave this unset (the normal case) and
   * the navbar will automatically switch between dark/light styling
   * based on the section currently behind it. Only pass this if you
   * need to force a specific look regardless of what's rendered.
   */
  backgroundTheme?: Theme;
}

export default function Navbar({ backgroundTheme }: NavbarProps) {
  const navRef = useRef<HTMLElement>(null);
  // The logo (center) and the Platform/Back and Socials/Back links (left
  // and right edges) are tracked as three independent refs and three
  // independent theme values. The navbar can genuinely span different-
  // colored surfaces at once (e.g. a light hero behind the logo, a
  // darker panel behind one of the corners), so a single shared sample
  // can't safely drive all three.
  const logoRef = useRef<HTMLAnchorElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const [logoTheme, setLogoTheme] = useState<Theme>("dark");
  const [linkTheme, setLinkTheme] = useState<Theme>("dark");
  const [leftLinkTheme, setLeftLinkTheme] = useState<Theme>("dark");

  const resolvedLogoTheme = backgroundTheme ?? logoTheme;
  const resolvedLinkTheme = backgroundTheme ?? linkTheme;
  const resolvedLeftLinkTheme = backgroundTheme ?? leftLinkTheme;
  const isLogoDark = resolvedLogoTheme === "dark";

  const pathname = usePathname();
  const router = useRouter();
  const isSocialsPage = pathname === "/socials";
  const isPlatformPage = pathname === "/platform";

  // Automatically switch text color and logo source based on the background
  const logoTextColor = isLogoDark ? "text-white" : "text-black";
  const logoSrc = isLogoDark ? "/bright_logo.png" : "/dark_logo.png";
  const linkTextColor = resolvedLinkTheme === "dark" ? "text-white" : "text-black";
  const leftLinkTextColor = resolvedLeftLinkTheme === "dark" ? "text-white" : "text-black";

  // Re-check whenever the page scrolls (works for native scroll and
  // custom scroll containers alike, since capture-phase listeners on
  // document catch scroll events from any scrollable descendant) or
  // the viewport resizes.
  useEffect(() => {
    if (backgroundTheme) return; // manual override in use — skip auto-detection
    const nav = navRef.current;
    if (!nav) return;

    let frame = 0;
    const check = () => {
      frame = 0;
      // Sample each element at its own actual on-screen position
      // (via getBoundingClientRect) rather than a guessed fixed
      // coordinate, so this stays correct across breakpoints, padding
      // changes, and viewport widths without hardcoding offsets — and
      // never risks landing on the reserved scrollbar-gutter strip at
      // the very edge of the viewport, which isn't page content at all.
      const logoEl = logoRef.current;
      if (logoEl) {
        const r = logoEl.getBoundingClientRect();
        setLogoTheme(themeAtPoint(nav, r.left + r.width / 2, r.top + r.height / 2));
      }
      const rightEl = rightRef.current;
      if (rightEl) {
        const r = rightEl.getBoundingClientRect();
        setLinkTheme(themeAtPoint(nav, r.left + r.width / 2, r.top + r.height / 2));
      }
      const leftEl = leftRef.current;
      if (leftEl) {
        const r = leftEl.getBoundingClientRect();
        setLeftLinkTheme(themeAtPoint(nav, r.left + r.width / 2, r.top + r.height / 2));
      }
    };
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(check);
    };

    check(); // initial read on mount
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [backgroundTheme]);

  // Tracks whether the page has scrolled past the top so the bar can
  // pick up a faint blurred scrim + hairline for legibility once
  // content is sliding underneath it. Purely cosmetic — it never
  // participates in the theme sampling above, since themeAtPoint
  // already excludes anything inside navEl.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Fade + lift the logo lockup in once the image has actually loaded,
  // instead of letting it pop in — same "intentional" motion language
  // used for images elsewhere on the site.
  const imgRef = useRef<HTMLImageElement>(null);
  const [logoLoaded, setLogoLoaded] = useState(false);

  useEffect(() => {
    // Covers the case where the image is already cached and the load
    // event fires before this listener is attached.
    if (imgRef.current?.complete) setLogoLoaded(true);
  }, []);

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      // Direct link with no prior history (e.g. /socials or /platform
      // opened straight from a bookmark or shared URL) — fall back
      // instead of leaving the user stuck.
      router.push("/");
    }
  };

  // Hairline tint follows the theme actually sampled at the right
  // edge, so the scrim reads correctly whether it lands over a light
  // or dark surface.
  const hairlineColor =
    resolvedLinkTheme === "dark" ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";
  const scrimColor =
    resolvedLinkTheme === "dark" ? "rgba(10,10,10,0.35)" : "rgba(255,255,255,0.5)";

  const navLinkClass = (textColor: string) =>
    `inline-flex min-h-11 items-center font-medium tracking-[-0.02em] leading-none transition-opacity duration-300 hover:opacity-70 ${textColor}`;
  const navLinkStyle = { fontSize: LINK_TEXT_SIZE };

  return (
    <nav
      ref={navRef}
      className="fixed left-0 top-0 z-50 grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center transition-[background-color,border-color] duration-300"
      style={{
        gap: NAV_GAP,
        paddingLeft: `max(${NAV_PADDING_X}, env(safe-area-inset-left))`,
        paddingRight: `max(${NAV_PADDING_X}, env(safe-area-inset-right))`,
        paddingTop: `calc(${NAV_PADDING_Y} + env(safe-area-inset-top))`,
        paddingBottom: NAV_PADDING_Y,
        backgroundColor: scrolled ? scrimColor : "transparent",
        borderBottom: `1px solid ${scrolled ? hairlineColor : "transparent"}`,
        backdropFilter: scrolled ? "blur(12px)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(12px)" : "none",
      }}
    >
      {/* Left-side link: "Platform" everywhere else, "Back" on the
          platform page itself, mirroring the Socials/Back link on the
          right. Independently themed (leftRef/resolvedLeftLinkTheme)
          since the bar can span two different-colored surfaces at
          once, same reasoning as the logo vs. right link split above. */}
      <div ref={leftRef} className="col-start-1 flex items-center justify-self-start">
        {isPlatformPage ? (
          <button
            type="button"
            onClick={handleBack}
            className={navLinkClass(leftLinkTextColor)}
            style={navLinkStyle}
            aria-label="Go back to the previous page"
          >
            Back
          </button>
        ) : (
          <Link href="/platform" className={navLinkClass(leftLinkTextColor)} style={navLinkStyle}>
            Platform
          </Link>
        )}
      </div>

      {/* Logo & Brand Name — pinned to the middle grid column so it's
          always dead-center, regardless of how wide the link on the
          right is ("Socials" vs "Back"). */}
      <Link
        ref={logoRef}
        href="/"
        className="col-start-2 flex items-center justify-self-center whitespace-nowrap"
        style={{
          gap: LOGO_GAP,
          opacity: logoLoaded ? 1 : 0,
          transform: logoLoaded ? "translateY(0)" : "translateY(8px)",
          transition:
            "opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <Image
          ref={imgRef}
          src={logoSrc}
          alt="Stratum"
          width={46}
          height={30}
          priority
          onLoad={() => setLogoLoaded(true)}
          className="shrink-0 object-contain"
          // Pins the box to exactly 46x30 so Tailwind's Preflight
          // (img { height: auto }) can't stretch just one axis and
          // throw off the aspect ratio. The mark stays a fixed size at
          // every breakpoint — that was the original, deliberate
          // choice, and it's small enough that it never needed to
          // shrink further on mobile.
          style={{ width: 46, height: 30 }}
        />
        <span
          // Text scales fluidly between the original mobile (20px) and
          // desktop (28px) sizes instead of snapping at one breakpoint.
          // leading-none + flex centering (rather than a hardcoded
          // 42px line-height) keeps the baseline aligned with the
          // logo mark at every size along that range, including the
          // smallest phones, instead of only the two original
          // breakpoints the fixed leading was tuned for.
          className={`font-semibold leading-none tracking-[-0.03em] transition-colors duration-300 ${logoTextColor}`}
          style={{ fontSize: LOGO_TEXT_SIZE }}
        >
          Stratum
        </span>
      </Link>

      {/* Right-side link: "Socials" everywhere else, "Back" on the
          socials page itself so there's always a way out of it.
          min-h-11 (44px) keeps the tap target comfortable on mobile
          even though the visible text is smaller there. */}
      <div ref={rightRef} className="col-start-3 flex items-center justify-self-end">
        {isSocialsPage ? (
          <button
            type="button"
            onClick={handleBack}
            className={navLinkClass(linkTextColor)}
            style={navLinkStyle}
            aria-label="Go back to the previous page"
          >
            Back
          </button>
        ) : (
          <Link href="/socials" className={navLinkClass(linkTextColor)} style={navLinkStyle}>
            Socials
          </Link>
        )}
      </div>
    </nav>
  );
}