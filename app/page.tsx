"use client";

import { useEffect, useRef } from "react";
import { Poppins } from "next/font/google";
import Hero from "../components/sections/hero";
import Section2 from "../components/sections/section-2";
import Section3 from "../components/sections/section-3";
import { useSectionSnapScroll } from "../components/shared/use-section-snap-scroll";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */
export default function Page() {
  const heroRef = useRef<HTMLElement>(null);
  const section2Ref = useRef<HTMLElement>(null);
  const section3Ref = useRef<HTMLElement>(null);
  const { containerRef, scrollToIndex } = useSectionSnapScroll([
    heroRef,
    section2Ref,
    section3Ref,
  ]);

  // Open the connection to the image host early so the very first
  // Cloudinary requests don't pay DNS/TLS setup cost on top of the fetch.
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "preconnect";
    link.href = "https://res.cloudinary.com";
    link.crossOrigin = "";
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  return (
    <main className={poppins.className}>
      <div
        ref={containerRef}
        className="h-[100dvh] w-full overflow-y-auto overscroll-none"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <Hero ref={heroRef} onSkipToWaitlist={() => scrollToIndex(1)} />
        <Section2 ref={section2Ref} />
        <Section3 ref={section3Ref} />
      </div>
    </main>
  );
}