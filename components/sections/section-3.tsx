"use client";

import { forwardRef } from "react";
import { RevealImage } from "../shared/reveal-image";
import { useReveal } from "../shared/use-reveal";
import { useWaitlistCount } from "../shared/use-waitlist-count";
import type { FanCard } from "../shared/types";

/* ------------------------------------------------------------------ */
/*  Section 3                                                          */
/* ------------------------------------------------------------------ */
// Pulled up over Section 2's card fan via a negative margin-top on the
// section itself (desktop only — see the `md:mt-[-375.22px]` class on
// Section3's <section>). -375.22 is tuned so the white background starts
// exactly where it does in the reference screenshot: it covers the bottom
// ~215px of the 548px-tall card cluster, leaving the top ~333px of the
// cards visible against Section 2's black background.
//
// HOW TO ADJUST THE OVERLAP:
//   - More negative -> pulls Section 3 UP further -> covers MORE of the
//     cards (less of the card fan stays visible).
//   - Less negative (closer to 0) -> pushes Section 3 DOWN -> covers LESS
//     of the cards (more of the card fan stays visible).
//   - mt-0 would remove the overlap entirely (sections just stack) — which
//     is exactly what mobile does, since there's no card pile bleeding up
//     from Section 2 there.

// These 7 images share ONE coordinate frame with the given Figma x/y — but
// unlike Section 2's pile (a small self-contained local group), these
// numbers are already page-width-relative (x runs ~0–1952 against a
// ~1920px-wide canvas) and all 7 bottoms align exactly at figma y=3350
// (verified: height = 3350 - y for every card with known dimensions).
// So x is used directly as `left`, and y only needs one shared offset
// subtracted to land in Section 3's own local space. That offset (2315)
// was calibrated directly against the reference screenshot — checked
// against 6 independent cards' positions, each landing within ~5px.
const SECTION_3_Y_OFFSET = 2315;

const TASTE_CARDS: FanCard[] = [
  {
    // NOTE: no x/y/width/height were given for kill_bill. These are
    // estimated from the screenshot itself (using the same "height = 3350
    // - y" rule the other 6 cards follow exactly), not from Figma — let me
    // know the real values if you have them.
    id: "kill-bill",
    src: "https://res.cloudinary.com/cgyxai8a/image/upload/v1783456214/kill_bill_j4aq6h.png",
    alt: "Kill Bill movie poster",
    x: -20,
    y: 2680,
    width: 261,
    height: 230,
    zIndexOverride: 4,
  },
  {
    id: "catching-fire",
    src: "https://res.cloudinary.com/cgyxai8a/image/upload/v1783456217/catching_fire_yjauvc.png",
    alt: "Catching Fire book cover",
    x: 173,
    y: 2603,
    width: 256,
    height: 317,
    zIndexOverride: 5,
  },
  {
    id: "green-poster",
    src: "https://res.cloudinary.com/cgyxai8a/image/upload/v1783456215/green_poster_ol029f.png",
    alt: "Green movie poster",
    x: 411,
    y: 2520,
    width: 250,
    height: 410,
    zIndexOverride: 6,
  },
  {
    id: "bunny",
    src: "https://res.cloudinary.com/cgyxai8a/image/upload/v1783456221/bunny_cts1na.png",
    alt: "Bunny poster",
    x: 644,
    y: 2425,
    width: 610,
    height: 495,
    zIndexOverride: 10,
  },
  {
    id: "spiderman",
    src: "https://res.cloudinary.com/cgyxai8a/image/upload/v1783456216/spiderman_rrrrkx.png",
    alt: "Spider-Man movie poster",
    x: 1244,
    y: 2520,
    width: 240,
    height: 400,
    zIndexOverride: 6,
  },
  {
    id: "purple-rain",
    src: "https://res.cloudinary.com/cgyxai8a/image/upload/v1783456217/purple_rain_wwxtvd.png",
    alt: "Purple Rain album cover",
    x: 1466,
    y: 2603,
    width: 256,
    height: 317,
    zIndexOverride: 5,
  },
  {
    id: "harry-potter",
    src: "https://res.cloudinary.com/cgyxai8a/image/upload/v1783456215/harry_potter_sdrocr.png",
    alt: "Harry Potter and the Deathly Hallows book cover",
    x: 1675,
    y: 2680,
    width: 261,
    height: 230,
    zIndexOverride: 4,
  },
];

// Split across two rows for the mobile marquee — each row scrolls
// opposite the other so the wall reads as woven rather than a single
// flat strip. Grouping is purely visual (not derived from any layout
// rule), chosen to mix aspect ratios within each row.
const TASTE_ROW_1_IDS = ["kill-bill", "green-poster", "spiderman", "harry-potter"];
const TASTE_ROW_2_IDS = ["catching-fire", "bunny", "purple-rain"];

function buildLoop(ids: string[]) {
  const row = ids
    .map((id) => TASTE_CARDS.find((c) => c.id === id))
    .filter((c): c is FanCard => Boolean(c));
  return [...row, ...row]; // doubled for a seamless -50% loop
}

const TASTE_ROW_1 = buildLoop(TASTE_ROW_1_IDS);
const TASTE_ROW_2 = buildLoop(TASTE_ROW_2_IDS);

const Section3 = forwardRef<HTMLElement>(function Section3(_props, ref) {
  const waitlistCount = useWaitlistCount();
  const headingReveal = useReveal<HTMLHeadingElement>(0);
  const subtitleReveal = useReveal<HTMLParagraphElement>(120);

  const headingRevealM = useReveal<HTMLHeadingElement>(0);
  const subtitleRevealM = useReveal<HTMLParagraphElement>(120);

  // Tablet / small-laptop reveal refs (new — same timing as the other two tiers)
  const headingRevealT = useReveal<HTMLHeadingElement>(0);
  const subtitleRevealT = useReveal<HTMLParagraphElement>(120);

  // Mobile row height — each card's width is derived from its own
  // aspect ratio against this shared height, so nothing gets cropped or
  // squeezed the way a fixed-box object-cover strip would.
  const TASTE_ROW_HEIGHT = 168;

  // Same two-row marquee, sized up for the tablet/small-laptop band — the
  // desktop card wall's absolute positions are calibrated against a
  // ~1920px-wide Figma canvas and run well past 1024px, so tablet reuses
  // this scrolling pattern instead of the absolute wall.
  const TASTE_ROW_HEIGHT_TABLET = 240;

  // Derive the card-wall height from the actual cards instead of a magic
  // number — otherwise the wrapper (and the section, since nothing else
  // constrains its height) keeps reserving space past the lowest card,
  // which is what was producing the white space at the bottom.
  const cardWallHeight = Math.max(
    ...TASTE_CARDS.map((card) => card.y - SECTION_3_Y_OFFSET + card.height)
  );

  // The cards' x values are calibrated to a fixed ~1936px-wide canvas
  // (see the comment above TASTE_CARDS), not the actual browser width.
  // Used below to scale the whole wall down to fit any xl-tier viewport
  // narrower than that canvas, instead of letting the rightmost cards
  // run past whatever's actually visible.
  const cardWallWidth = Math.max(...TASTE_CARDS.map((card) => card.x + card.width));

  return (
    <section
      ref={ref}
      className="relative z-20 mt-0 w-full overflow-hidden bg-white min-h-0 xl:mt-[-375.22px]"
    >
      <style>{`
        @keyframes stratum-taste-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .stratum-taste-marquee-a {
          animation: stratum-taste-marquee 30s linear infinite;
        }
        .stratum-taste-marquee-b {
          animation: stratum-taste-marquee 24s linear infinite reverse;
        }
        @media (prefers-reduced-motion: reduce) {
          .stratum-taste-marquee-a,
          .stratum-taste-marquee-b {
            animation: none;
          }
        }
      `}</style>

      {/* Desktop (≥1280px) — unchanged design. The -375.22px pull-up above
          lives on the section itself, not an inner wrapper: this section
          is overflow-hidden, so a negative margin on a child can't
          collapse through that to move the section's own white
          background — it has to sit on the section directly to pull the
          whole white area up over Section 2's card pile. Both the pull-up
          and this block are now gated behind xl instead of md, freeing
          the md–xl band for its own layout below. */}
      <div className="relative hidden xl:block">
        {/* Title + subtitle - normal flow */}
        <div
          className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-6 text-center"
          style={{ paddingTop: 114 }}
        >
          <h2
            ref={headingReveal.ref}
            className="font-medium leading-none tracking-[-0.055em] text-[92px] text-black"
            style={headingReveal.style}
          >
            Rate what you like.
            <br />
            Taste finds it&apos;s own.
          </h2>

          <p
            ref={subtitleReveal.ref}
            className="font-medium tracking-[-0.05em] text-black"
            style={{ marginTop: 53, fontSize: 20, lineHeight: "30px", ...subtitleReveal.style }}
          >
            <span>1k+</span> people already on the waitlist. Growing daily.
            <br />
            From sonic minimalists to cult film obsessives. They&apos;re all waiting.
          </p>
        </div>

        {/* Card wall - each card absolutely positioned straight from its own
            Figma x/y (y shifted by SECTION_3_Y_OFFSET), fully independent of
            the others. Wrapper height is derived from the cards themselves
            (see cardWallHeight above) so the section doesn't run on past
            the last card.

            The x values run out to ~1936px (cardWallWidth), calibrated to
            that fixed canvas rather than the real viewport. Unscaled, any
            xl-tier width narrower than ~1936px — which is most real
            screens, including common ones like 1440 and 1536 — clipped
            the rightmost 1-2 cards straight off the edge via the
            section's overflow-hidden, since their absolute position ran
            past whatever was actually visible. scale(min(1, 100vw /
            cardWallWidth)) shrinks the whole wall uniformly, anchored to
            the same top-left corner it already renders from, so every
            card stays visible and correctly fanned. It's an exact no-op
            (scale(1)) once the viewport reaches cardWallWidth, so screens
            that already showed everything correctly are pixel-identical
            to before. */}
        <div
          className="relative w-full"
          style={{
            height: `calc(${cardWallHeight}px * min(1, 100vw / ${cardWallWidth}px))`,
          }}
        >
          <div
            className="absolute left-0 top-0"
            style={{
              width: cardWallWidth,
              height: cardWallHeight,
              transform: `scale(min(1, 100vw / ${cardWallWidth}px))`,
              transformOrigin: "top left",
            }}
          >
            {TASTE_CARDS.map((card, i) => (
              <RevealImage
                key={card.id}
                src={card.src}
                alt={card.alt}
                width={card.width}
                height={card.height}
                delay={i * 50}
                style={{
                  position: "absolute",
                  left: card.x,
                  top: card.y - SECTION_3_Y_OFFSET,
                  zIndex: card.zIndexOverride,
                }}
                className="object-contain drop-shadow-[0_30px_40px_rgba(0,0,0,0.45)]"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Tablet & small-laptop (~768px–1279px) — new. The desktop card
          wall's absolute positions are calibrated against a ~1920px-wide
          Figma canvas and run well past 1024px, so this tier reuses the
          two-row marquee mobile already established, just sized up. No
          pull-up margin here either — same reasoning as mobile: without
          the full desktop card pile there's nothing to tuck the white
          background under. */}
      <div className="hidden w-full flex-col items-center px-8 pb-20 pt-16 md:flex xl:hidden">
        <div
          className="mx-auto flex max-w-2xl flex-col items-center px-2 text-center"
          style={{ paddingTop: 40 }}
        >
          <h2
            ref={headingRevealT.ref}
            className="font-medium leading-[1.05] tracking-[-0.03em] text-[clamp(42px,6vw,68px)] text-black"
            style={headingRevealT.style}
          >
            Rate what you like.
            <br />
            Taste finds it&apos;s own.
          </h2>

          <p
            ref={subtitleRevealT.ref}
            className="mt-6 max-w-[46ch] font-medium tracking-[-0.03em] text-[17px] leading-[1.5] text-black"
            style={subtitleRevealT.style}
          >
            <span>1k+</span> people already on the waitlist. Growing daily.
            <br />
            From sonic minimalists to cult film obsessives. They&apos;re all waiting.
          </p>
        </div>

        <div className="mt-14 flex w-full flex-col gap-5">
          {[
            { cards: TASTE_ROW_1, className: "stratum-taste-marquee-a" },
            { cards: TASTE_ROW_2, className: "stratum-taste-marquee-b" },
          ].map((row, rowIndex) => (
            <div
              key={rowIndex}
              className="relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)] [-webkit-mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]"
            >
              <div className={`flex w-max items-center gap-5 py-1 ${row.className}`}>
                {row.cards.map((card, i) => {
                  const halfLength = row.cards.length / 2;
                  const isDuplicate = i >= halfLength;
                  const width = Math.round(
                    TASTE_ROW_HEIGHT_TABLET * (card.width / card.height)
                  );
                  return (
                    <RevealImage
                      key={`${card.id}-${i}-t`}
                      src={card.src}
                      alt={card.alt}
                      aria-hidden={isDuplicate || undefined}
                      width={width}
                      height={TASTE_ROW_HEIGHT_TABLET}
                      delay={(i % halfLength) * 50}
                      className="shrink-0 rounded-2xl object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.3)]"
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile — real stacked layout, two-row card marquee scrolling in
          opposite directions. Generous top/bottom padding so the section
          doesn't read as an abrupt sliver after Section 2 — no pull-up
          needed here since there's no card pile bleeding up from Section 2
          on mobile. */}
      <div className="flex w-full flex-col items-center px-5 pb-28 pt-16 md:hidden">
        <h2
          ref={headingRevealM.ref}
          className="max-w-[17ch] font-medium leading-[1.3] tracking-[-0.02em] text-[27px] text-black/55"
          style={headingRevealM.style}
        >
          Rate what you like. Taste finds it&apos;s{" "}
          <span className="italic text-black">own.</span>
        </h2>

        <p
          ref={subtitleRevealM.ref}
          className="mt-4 max-w-[30ch] font-medium tracking-[-0.02em] text-[14px] leading-[1.5] text-black/60"
          style={subtitleRevealM.style}
        >
          <span>1k+ </span> people already on the waitlist. Growing daily. From sonic
          minimalists to cult film obsessives. They&apos;re all waiting.
        </p>

        <div className="mt-12 flex w-full flex-col gap-4">
          {[
            { cards: TASTE_ROW_1, className: "stratum-taste-marquee-a" },
            { cards: TASTE_ROW_2, className: "stratum-taste-marquee-b" },
          ].map((row, rowIndex) => (
            <div
              key={rowIndex}
              className="relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)] [-webkit-mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]"
            >
              <div className={`flex w-max items-center gap-4 py-1 ${row.className}`}>
                {row.cards.map((card, i) => {
                  const halfLength = row.cards.length / 2;
                  const isDuplicate = i >= halfLength;
                  const width = Math.round(
                    TASTE_ROW_HEIGHT * (card.width / card.height)
                  );
                  return (
                    <RevealImage
                      key={`${card.id}-${i}`}
                      src={card.src}
                      alt={card.alt}
                      aria-hidden={isDuplicate || undefined}
                      width={width}
                      height={TASTE_ROW_HEIGHT}
                      delay={(i % halfLength) * 50}
                      className="shrink-0 rounded-2xl object-contain drop-shadow-[0_16px_24px_rgba(0,0,0,0.25)]"
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});
Section3.displayName = "Section3";

export default Section3;