import { Poppins } from "next/font/google";
import Navbar from "@/components/navbar";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

/* ------------------------------------------------------------------ */
/*  Fluid sizing — same approach as the navbar: interpolate smoothly    */
/*  between two states instead of snapping at a single breakpoint, so   */
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

// Headline pushed larger than before so it reads as a genuine hero
// statement rather than a page title; the accent line stays a step
// down so the closing line echoes the thesis instead of competing with it.
const TITLE_SIZE = fluid(38, 72);
const ACCENT_SIZE = fluid(19, 28);

export default function ManifestoPage() {
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
        Manifesto content.
        Top/bottom padding clears the navbar and the fixed email footer;
        horizontal padding respects the safe area on notched phones in
        landscape, where env(safe-area-inset-*) can exceed the base 24px.
        items-center (not justify-center) so the copy reads top-down and
        never gets clipped behind the navbar on shorter viewports.
      */}
      <section
        className="relative flex flex-1 flex-col items-center pb-40 pt-36 text-center md:pb-48 md:pt-44"
        style={{
          paddingLeft: "max(1.5rem, env(safe-area-inset-left))",
          paddingRight: "max(1.5rem, env(safe-area-inset-right))",
        }}
      >
        {/* 
          Soft glow behind the headline — same white the rest of the page
          already uses, just at very low opacity. Gives the hero a focal
          point instead of copy sitting flat on pure black.
        */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.07), transparent 60%)",
          }}
        />

        <span
          className="fade-up text-[11px] font-medium uppercase tracking-[0.3em] text-white/40"
          style={{ animationDelay: "0ms" }}
        >
          A Manifesto
        </span>

        <h1
          className="fade-up mt-6 font-semibold leading-[1.05] tracking-tight text-white"
          style={{ fontSize: TITLE_SIZE, animationDelay: "100ms" }}
        >
          Taste is identity.
        </h1>

        <div
          className="fade-up mt-10 flex max-w-[620px] flex-col gap-5 text-[15px] leading-[1.75] text-white/55 sm:text-[16px] md:mt-12 md:max-w-[640px] md:text-[17px]"
          style={{ animationDelay: "200ms" }}
        >
          <p>
            What you love says more about you than anything you&rsquo;d
            choose to say yourself. The film you&rsquo;ve rewatched until you
            know every cut. The song that got you through a year you don&rsquo;t
            talk about. The book you keep lending out and never asking back.
          </p>
          <p>
            Stratum turns your ratings on film, music, and books into a taste
            profile — then finds the people who match it. Not friends of
            friends. Not a feed. People who loved the same things, for the
            same reasons.
          </p>
        </div>

        {/* 
          Signature divider — the three things you actually rate on Stratum,
          standing in for the plain rule that used to sit here. Structure
          that carries real information instead of just decorating the gap.
        */}
        <div
          className="fade-up my-12 flex items-center justify-center gap-3 text-[11px] font-medium uppercase tracking-[0.3em] text-white/35 md:my-14"
          style={{ animationDelay: "300ms" }}
        >
          <span>Film</span>
          <span className="h-px w-5 bg-white/20" aria-hidden="true" />
          <span>Music</span>
          <span className="h-px w-5 bg-white/20" aria-hidden="true" />
          <span>Books</span>
        </div>

        <p
          className="fade-up max-w-[20ch] font-medium leading-[1.3] tracking-tight text-white"
          style={{ fontSize: ACCENT_SIZE, animationDelay: "400ms" }}
        >
          Rate what moves you. Find who thinks like you.
        </p>
      </section>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-up {
          animation: fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .fade-up {
            animation: none;
            opacity: 1;
            transform: none;
          }
        }
      `}</style>
    </main>
  );
}