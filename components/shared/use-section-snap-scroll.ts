"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";
import { prefersReducedMotion } from "./use-reveal";

/* ------------------------------------------------------------------ */
/*  Section-snap scrolling                                             */
/*  Wheel/touch/keyboard input is treated like a swipe on TikTok or    */
/*  Reels: a gesture commits fully to the next or previous section —   */
/*  the user is never left resting halfway between two. Sections that  */
/*  are themselves taller than the viewport (Section 2's card pile,    */
/*  for example) still scroll freely within themselves first; only     */
/*  once a section is fully revealed does the next gesture hand off    */
/*  to the next one.                                                   */
/* ------------------------------------------------------------------ */
const SNAP_ANIMATION_MS = 650;
const EDGE_THRESHOLD_PX = 6; // "close enough" to a section boundary
const SETTLE_DELAY_MS = 140; // pause after scrolling stops before checking

// Fast start, soft landing — the deceleration curve that gives the
// "held and released" feel instead of a mechanical linear scroll.
function easeOutExpo(t: number) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export function useSectionSnapScroll(sectionRefs: RefObject<HTMLElement | null>[]) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isAnimating = useRef(false);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getBoundaries = useCallback(
    () => sectionRefs.map((r) => r.current?.offsetTop ?? 0),
    [sectionRefs]
  );

  const indexAt = (scrollTop: number, boundaries: number[]) => {
    let idx = 0;
    for (let i = 0; i < boundaries.length; i++) {
      if (scrollTop >= boundaries[i] - EDGE_THRESHOLD_PX) idx = i;
    }
    return idx;
  };

  const nearestBoundary = (scrollTop: number, boundaries: number[]) =>
    boundaries.reduce((best, b) =>
      Math.abs(b - scrollTop) < Math.abs(best - scrollTop) ? b : best
    );

  const animateScrollTo = useCallback((target: number) => {
    const el = containerRef.current;
    if (!el) return;

    if (prefersReducedMotion()) {
      el.scrollTop = target;
      return;
    }

    isAnimating.current = true;
    const start = el.scrollTop;
    const distance = target - start;
    let startTime: number | null = null;

    const step = (now: number) => {
      if (startTime === null) startTime = now;
      const t = Math.min(1, (now - startTime) / SNAP_ANIMATION_MS);
      el.scrollTop = start + distance * easeOutExpo(t);
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        isAnimating.current = false;
      }
    };
    requestAnimationFrame(step);
  }, []);

  // Wheel / trackpad: commit fully to the next or previous section the
  // moment the current one has nothing left to reveal in that direction.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (isAnimating.current) {
        e.preventDefault();
        return;
      }
      if (Math.abs(e.deltaY) < 1) return;

      const boundaries = getBoundaries();
      const scrollTop = el.scrollTop;
      const idx = indexAt(scrollTop, boundaries);
      const dir = e.deltaY > 0 ? 1 : -1;

      if (dir === 1) {
        const sectionBottom =
          idx < boundaries.length - 1 ? boundaries[idx + 1] : el.scrollHeight;
        const viewportBottom = scrollTop + el.clientHeight;
        if (sectionBottom - viewportBottom > EDGE_THRESHOLD_PX) return; // more of this section to reveal
        if (idx < boundaries.length - 1) {
          e.preventDefault();
          animateScrollTo(boundaries[idx + 1]);
        }
      } else {
        if (scrollTop - boundaries[idx] > EDGE_THRESHOLD_PX) return; // more of this section above
        if (idx > 0) {
          e.preventDefault();
          animateScrollTo(boundaries[idx - 1]);
        }
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [getBoundaries, animateScrollTo]);

  // Touch / momentum scroll: let it scroll natively (best feel on
  // mobile), then once it settles, correct onto the nearest section
  // edge if the gesture ended in the gap between two sections.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleScroll = () => {
      if (isAnimating.current) return;
      if (settleTimer.current) clearTimeout(settleTimer.current);
      settleTimer.current = setTimeout(() => {
        if (isAnimating.current || !el) return;
        const boundaries = getBoundaries();
        const scrollTop = el.scrollTop;
        const idx = indexAt(scrollTop, boundaries);
        const sectionBottom =
          idx < boundaries.length - 1 ? boundaries[idx + 1] : el.scrollHeight;
        const viewportBottom = scrollTop + el.clientHeight;
        const atTop = scrollTop - boundaries[idx] <= EDGE_THRESHOLD_PX;
        const atBottom = sectionBottom - viewportBottom <= EDGE_THRESHOLD_PX;
        if (!atTop && !atBottom) return; // mid-section — the user is reading, leave it
        const target = nearestBoundary(scrollTop, boundaries);
        if (Math.abs(target - scrollTop) > EDGE_THRESHOLD_PX) {
          animateScrollTo(target);
        }
      }, SETTLE_DELAY_MS);
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", handleScroll);
      if (settleTimer.current) clearTimeout(settleTimer.current);
    };
  }, [getBoundaries, animateScrollTo]);

  // Arrow / page keys jump a full section at a time, unless the user is
  // typing in a form field.
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (isAnimating.current) return;
      if (!["ArrowDown", "ArrowUp", "PageDown", "PageUp"].includes(e.key)) return;

      const el = containerRef.current;
      if (!el) return;
      const boundaries = getBoundaries();
      const idx = indexAt(el.scrollTop, boundaries);

      if (e.key === "ArrowDown" || e.key === "PageDown") {
        if (idx < boundaries.length - 1) {
          e.preventDefault();
          animateScrollTo(boundaries[idx + 1]);
        }
      } else if (idx > 0) {
        e.preventDefault();
        animateScrollTo(boundaries[idx - 1]);
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [getBoundaries, animateScrollTo]);

  // Programmatic jump to a section by index — used by things like the
  // Hero's "Skip to waitlist" button, which need to trigger the same
  // animated snap as a real scroll gesture.
  const scrollToIndex = useCallback(
    (index: number) => {
      const boundaries = getBoundaries();
      if (boundaries.length === 0) return;
      const clamped = Math.min(Math.max(index, 0), boundaries.length - 1);
      animateScrollTo(boundaries[clamped]);
    },
    [getBoundaries, animateScrollTo]
  );

  // This container owns page scrolling while it's mounted.
  useEffect(() => {
    const html = document.documentElement;
    const prevHtml = html.style.overflow;
    const prevBody = document.body.style.overflow;
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, []);

  return { containerRef, scrollToIndex };
}