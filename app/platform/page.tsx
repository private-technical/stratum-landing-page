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

const TITLE_SIZE = fluid(34, 64);
const ACCENT_SIZE = fluid(20, 30);

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
        className="flex flex-1 flex-col items-center pb-40 pt-36 text-center md:pb-48 md:pt-44"
        style={{
          paddingLeft: "max(1.5rem, env(safe-area-inset-left))",
          paddingRight: "max(1.5rem, env(safe-area-inset-right))",
        }}
      >

        <h1
          className="font-semibold leading-[1.05] tracking-tight text-white"
          style={{ fontSize: TITLE_SIZE }}
        >
          Taste is identity.
        </h1>

        <div className="mt-10 flex max-w-[620px] flex-col gap-5 text-[15px] leading-[1.75] text-white/55 sm:text-[16px] md:mt-12 md:max-w-[640px] md:text-[17px]">
          <p>
            What you love reveals who you are more honestly than anything you
            could say about yourself. The films you return to. The albums
            that live rent-free in your head. The books that rewired how you
            think.
          </p>
          <p>
            Stratum is a social app where you rate films, music, and books.
            Your ratings build a taste profile, and that profile finds you
            people whose taste matches yours at a freakishly precise level.
            Not followers. Not mutuals. People who rated the same things you
            did, the same way you did.
          </p>
        </div>

        <div
          aria-hidden="true"
          className="my-12 h-px w-24 bg-gradient-to-r from-transparent via-white/20 to-transparent md:my-14"
        />

        <p
          className="max-w-[20ch] font-medium leading-[1.3] tracking-tight text-white"
          style={{ fontSize: ACCENT_SIZE }}
        >
          Rate what moves you. Find who thinks like you.
        </p>
      </section>
    </main>
  );
}