"use client";

import { useEffect, useRef, useState } from "react";

export function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

/* ------------------------------------------------------------------ */
/*  Reveal: the same fade + lift used on images (RevealImage above),   */
/*  extended to text, buttons, and form elements so the whole page     */
/*  reads as one consistent motion language rather than "animated      */
/*  images, static everything else." Triggers once an element enters   */
/*  the viewport — which covers Hero's content on initial load (it's   */
/*  already in view) and Section 2/3's content as the snap-scroll      */
/*  brings them on screen — and never re-hides once shown.             */
/* ------------------------------------------------------------------ */
export function useReveal<T extends HTMLElement = HTMLElement>(delay = 0) {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (prefersReducedMotion()) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return {
    ref,
    style: {
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(10px)",
      transition:
        "opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1)",
      transitionDelay: `${delay}ms`,
    } satisfies React.CSSProperties,
  };
}