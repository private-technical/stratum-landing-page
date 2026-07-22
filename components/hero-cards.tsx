"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion, type PanInfo } from "framer-motion";

/* ------------------------------------------------------------------ */
/*  Fluid sizing                                                       */
/*                                                                      */
/*  Card position/size is driven by a `<style>` tag with @container    */
/*  rules, not inline styles — inline styles always beat stylesheet     */
/*  rules, so a container query can't override them. Below TIER_BREAK,  */
/*  only the first 4 cards render (bigger); at and above it, all 7      */
/*  render at the original design proportions. Every number is derived  */
/*  from the real available space at each breakpoint, not guessed.      */
/* ------------------------------------------------------------------ */
const CONTAINER_MIN = 320;
const CONTAINER_MAX = 1440;
const TIER_BREAK = 700; // container width where 4 cards become 7
const PADDING_MIN = 16;
const PADDING_MAX = 32;
const VISIBLE_COMPACT = 4;
const SAFETY_BUFFER = 10; // px of slack subtracted before solving for scale

function fluid(
  min: number,
  max: number,
  unit: "vw" | "cqw" = "cqw",
  refMin = CONTAINER_MIN,
  refMax = CONTAINER_MAX
): string {
  const slope = (max - min) / (refMax - refMin);
  const coefficient = slope * 100;
  const intercept = min - slope * refMin;
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  const sign = coefficient < 0 ? "-" : "+";
  return `clamp(${lo.toFixed(2)}px, calc(${intercept.toFixed(2)}px ${sign} ${Math.abs(
    coefficient
  ).toFixed(2)}${unit}), ${hi.toFixed(2)}px)`;
}

function cld(url: string, width: number) {
  const w = Math.max(1, Math.round(width));
  return url.replace(
    "/upload/",
    `/upload/f_auto,q_auto,dpr_auto,w_${w},c_limit/`
  );
}

function RevealImage({
  src,
  alt,
  aspectRatio,
  className,
  delay = 0,
}: {
  src: string;
  alt: string;
  aspectRatio: number;
  className?: string;
  delay?: number;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (imgRef.current?.complete) setLoaded(true);
  }, []);

  return (
    <img
      ref={imgRef}
      src={cld(src, 290)}
      alt={alt}
      draggable={false}
      loading="eager"
      decoding="async"
      fetchPriority="high"
      onLoad={() => setLoaded(true)}
      className={className}
      style={{
        aspectRatio,
        opacity: loaded ? 1 : 0,
        transform: loaded ? "translateY(0)" : "translateY(10px)",
        transition:
          "opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1)",
        transitionDelay: `${delay}ms`,
      }}
    />
  );
}

interface HeroCard {
  id: string;
  src: string;
  alt: string;
}

const HERO_CARDS: HeroCard[] = [
  {
    id: "rainbows",
    src: "https://res.cloudinary.com/cgyxai8a/image/upload/v1784120998/Rectangle_63_a3k09h.png",
    alt: "In rainbows album cover",
  },
  {
    id: "the-brothers-karamazov",
    src: "https://res.cloudinary.com/cgyxai8a/image/upload/v1784121894/Rectangle_62_fyobsj.png",
    alt: "The Brothers Karamazov book cover",
  },
  {
    id: "parasite",
    src: "https://res.cloudinary.com/cgyxai8a/image/upload/v1784120998/Rectangle_61_hw6hub.png",
    alt: "Parasite film poster",
  },
  {
    id: "the-godfather",
    src: "https://res.cloudinary.com/cgyxai8a/image/upload/v1784121885/the_godfather_x2sync.png",
    alt: "The Godfather film poster",
  },
  {
    id: "sapiens",
    src: "https://res.cloudinary.com/cgyxai8a/image/upload/v1784120997/Rectangle_59_mspvz0.png",
    alt: "Sapiens book cover",
  },
  {
    id: "dark-knight",
    src: "https://res.cloudinary.com/cgyxai8a/image/upload/v1784120998/Rectangle_58_xoys7x.png",
    alt: "Dark Knight film poster",
  },
  {
    id: "blond-frank-ocean",
    src: "https://res.cloudinary.com/cgyxai8a/image/upload/v1784121901/Rectangle_57_zbxe5f.png",
    alt: "Blond by Frank Ocean album cover",
  },
];

interface Slot {
  marginLeft: number;
  translateY: number;
}

const BASE_CARD_WIDTH = 290;
const BASE_CARD_HEIGHT = 284;
const CARD_ASPECT_RATIO = BASE_CARD_WIDTH / BASE_CARD_HEIGHT;

const BASE_SLOTS: Slot[] = [
  { marginLeft: 0, translateY: 0 },
  { marginLeft: -114.78, translateY: -56 },
  { marginLeft: -109.13, translateY: -37.98 },
  { marginLeft: -134.43, translateY: -31.9 },
  { marginLeft: -135.41, translateY: -40.32 },
  { marginLeft: -114.59, translateY: -34.9 },
  { marginLeft: -131.89, translateY: -34.9 },
];

// Native (scale = 1) total width of the first `k` cards laid out with
// their real overlaps — used to solve for how much a tier needs to
// shrink to actually fit.
function prefixWidth(k: number): number {
  let w = BASE_CARD_WIDTH;
  for (let i = 1; i < k; i++) w += BASE_CARD_WIDTH + BASE_SLOTS[i].marginLeft;
  return w;
}

function paddingAt(containerWidth: number): number {
  const slope = (PADDING_MAX - PADDING_MIN) / (CONTAINER_MAX - CONTAINER_MIN);
  const val = PADDING_MIN + slope * (containerWidth - CONTAINER_MIN);
  return Math.min(PADDING_MAX, Math.max(PADDING_MIN, val));
}

// The largest scale that guarantees `count` cards fit inside
// `containerWidth`, after this component's own padding and a fixed
// safety buffer — not a guessed round number.
function safeScale(containerWidth: number, count: number, bufferPx: number): number {
  const content = containerWidth - 2 * paddingAt(containerWidth) - bufferPx;
  return content / prefixWidth(count);
}

const SCALE_A_MIN = safeScale(CONTAINER_MIN, VISIBLE_COMPACT, SAFETY_BUFFER);
const SCALE_A_MAX = Math.min(1, safeScale(TIER_BREAK, VISIBLE_COMPACT, SAFETY_BUFFER));
const SCALE_B_MIN = safeScale(TIER_BREAK, HERO_CARDS.length, SAFETY_BUFFER);
const SCALE_B_MAX = 1;

function tierCSS(
  scaleMin: number,
  scaleMax: number,
  refMin: number,
  refMax: number,
  count: number,
  scopeClass: string
): string {
  const width = fluid(BASE_CARD_WIDTH * scaleMin, BASE_CARD_WIDTH * scaleMax, "cqw", refMin, refMax);
  const lines = [`.${scopeClass} .hero-fan-img { width: ${width}; }`];
  for (let i = 1; i < count; i++) {
    const s = BASE_SLOTS[i];
    const ml = fluid(s.marginLeft * scaleMin, s.marginLeft * scaleMax, "cqw", refMin, refMax);
    const ty = fluid(s.translateY * scaleMin, s.translateY * scaleMax, "cqw", refMin, refMax);
    lines.push(`.${scopeClass} .hero-fan-row > *:nth-child(${i + 1}) { margin-left: ${ml}; }`);
    lines.push(
      `.${scopeClass} .hero-fan-row > *:nth-child(${i + 1}) > .hero-fan-lift { transform: translateY(${ty}); }`
    );
  }
  return lines.join("\n");
}

function buildFanCSS(scopeClass: string): string {
  return [
    `.${scopeClass} { container-type: inline-size; }`,
    `.${scopeClass} .hero-fan-row > * { margin-left: 0; }`,
    `@container (max-width: ${(TIER_BREAK - 0.02).toFixed(2)}px) {`,
    `.${scopeClass} .hero-fan-row > *:nth-child(n+${VISIBLE_COMPACT + 1}) { display: none; }`,
    tierCSS(SCALE_A_MIN, SCALE_A_MAX, CONTAINER_MIN, TIER_BREAK, VISIBLE_COMPACT, scopeClass),
    `}`,
    `@container (min-width: ${TIER_BREAK}px) {`,
    tierCSS(SCALE_B_MIN, SCALE_B_MAX, TIER_BREAK, CONTAINER_MAX, HERO_CARDS.length, scopeClass),
    `}`,
  ].join("\n");
}

const UP_THRESHOLD = 70;
const SPRING = { type: "spring" as const, stiffness: 380, damping: 34 };

/**
 * True only on devices where hover is a real, sustained pointer state
 * (mouse/trackpad) rather than a synthetic "hover" some mobile browsers
 * apply for a moment after a tap. Without this, whileHover's scale-up
 * can get stuck applied to whatever card was last tapped on a phone,
 * since there's no mouse to move away and clear it.
 *
 * This also now gates which drag interaction a device gets at all — see
 * the drag/touchAction logic in the render below.
 */
function useHasHoverCapability() {
  const [hasHover, setHasHover] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setHasHover(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return hasHover;
}

function moveItem<T>(arr: T[], from: number, to: number): T[] {
  const next = arr.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function randomOtherIndex(current: number, length: number) {
  if (length <= 1) return current;
  let next = current;
  while (next === current) next = Math.floor(Math.random() * length);
  return next;
}

export default function HeroCards() {
  const prefersReducedMotion = useReducedMotion();
  const hasHover = useHasHoverCapability();
  const containerRef = useRef<HTMLDivElement>(null);
  const [order, setOrder] = useState<string[]>(() => HERO_CARDS.map((c) => c.id));
  const [activeId, setActiveId] = useState<string | null>(null);

  const uid = useId().replace(/:/g, "");
  const scopeClass = `hero-fan-${uid}`;
  const styleText = useMemo(() => buildFanCSS(scopeClass), [scopeClass]);

  const cardById = useMemo(
    () => Object.fromEntries(HERO_CARDS.map((c) => [c.id, c])),
    []
  );

  const transition = prefersReducedMotion ? { duration: 0 } : SPRING;

  // Only cards currently visible (not display:none'd by the compact
  // tier) are reachable — reading this live means a toss can never land
  // a card in a hidden seat.
  const getVisibleEls = () => {
    const rowEl = containerRef.current;
    if (!rowEl) return [] as Element[];
    return Array.from(rowEl.children).filter(
      (el) => getComputedStyle(el as Element).display !== "none"
    );
  };

  const handleDragEnd =
    (index: number) =>
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      setActiveId(null);
      const { offset } = info;
      let targetIndex = index;

      const rowEl = containerRef.current;
      const visible = getVisibleEls();
      const visibleCount = visible.length || order.length;
      const totalWidth = rowEl?.getBoundingClientRect().width ?? 0;
      const cardWidth = (visible[0] as HTMLElement | undefined)?.getBoundingClientRect().width ?? 0;
      const step = visibleCount > 1 ? (totalWidth - cardWidth) / (visibleCount - 1) : 0;

      // Fling-up-to-shuffle is a hover-capable-device gesture only: on
      // touch, drag is axis-locked to horizontal (see the `drag` prop
      // below), so a vertical toss never reaches here anyway — this
      // check is kept explicit rather than relied on implicitly.
      if (hasHover && offset.y < -UP_THRESHOLD && Math.abs(offset.y) > Math.abs(offset.x)) {
        targetIndex = randomOtherIndex(index, visibleCount);
      } else if (step > 0 && Math.abs(offset.x) > step / 2) {
        const seatsMoved = Math.round(offset.x / step);
        targetIndex = Math.min(visibleCount - 1, Math.max(0, index + seatsMoved));
      }

      if (targetIndex !== index) {
        setOrder((prev) => moveItem(prev, index, targetIndex));
      }
    };

  // Touch replacement for the fling-up gesture: a plain tap sends the
  // card to a random new seat. Vertical drag can't be captured on touch
  // without also capturing (and breaking) the page's own scroll, so
  // this gives touch users an equivalent bit of delight through a
  // gesture that never competes with scrolling.
  const handleTapShuffle = (index: number) => () => {
    if (hasHover) return; // desktop keeps the fling-up gesture instead
    const visibleCount = getVisibleEls().length || order.length;
    const targetIndex = randomOtherIndex(index, visibleCount);
    if (targetIndex !== index) {
      setOrder((prev) => moveItem(prev, index, targetIndex));
    }
  };

  return (
    <div
      className={`${scopeClass} w-full`}
      style={{
        marginTop: fluid(56, 100, "vw"),
        paddingLeft: fluid(PADDING_MIN, PADDING_MAX, "vw"),
        paddingRight: fluid(PADDING_MIN, PADDING_MAX, "vw"),
      }}
    >
      <style>{styleText}</style>
      <div
        ref={containerRef}
        className="hero-fan-row flex items-end justify-center"
        aria-hidden="true"
      >
        {order.map((id, i) => {
          const card = cardById[id];
          const isActive = activeId === id;

          return (
            <motion.div
              key={id}
              layout
              transition={transition}
              drag={hasHover ? true : "x"}
              dragConstraints={containerRef}
              dragElastic={0.15}
              dragMomentum={false}
              dragSnapToOrigin
              whileDrag={prefersReducedMotion ? undefined : { scale: 1.06 }}
              whileHover={
                hasHover && !activeId && !prefersReducedMotion
                  ? { scale: 1.03 }
                  : undefined
              }
              whileTap={
                !hasHover && !prefersReducedMotion ? { scale: 0.94 } : undefined
              }
              onDragStart={() => setActiveId(id)}
              onDragEnd={handleDragEnd(i)}
              onTap={handleTapShuffle(i)}
              className="shrink-0 cursor-grab active:cursor-grabbing"
              style={{
                zIndex: isActive ? 50 : i + 1,
                // Desktop: block all native touch handling so drag
                // owns the gesture fully (irrelevant on a mouse, but
                // harmless). Touch: allow native vertical scrolling to
                // pass through — only horizontal drags are captured —
                // so swiping a card never traps the page from scrolling.
                touchAction: hasHover ? "none" : "pan-y",
              }}
            >
              <div className="hero-fan-lift">
                <RevealImage
                  src={card.src}
                  alt={card.alt}
                  aspectRatio={CARD_ASPECT_RATIO}
                  delay={i * 60}
                  className={`hero-fan-img pointer-events-none select-none object-contain drop-shadow-[0_30px_40px_rgba(0,0,0,0.55)] transition-shadow duration-300 ${
                    isActive ? "drop-shadow-[0_40px_55px_rgba(0,0,0,0.65)]" : ""
                  }`}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}