"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import Navbar from "../navbar";
import HeroModal from "../hero-modal";
import HeroCards from "../hero-cards";
import { useReveal } from "../shared/use-reveal";
import { triggerTasteScrape } from "../shared/pocketbase";
import { TasteAutocomplete } from "../shared/taste-autocomplete";

interface HeroProps {
  onSkipToWaitlist?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Desktop title sizing — the layout switches from mobile to this      */
/*  "desktop" block at the md breakpoint (768px), but a flat 96px was   */
/*  only ever tuned for real desktop widths. On tablet widths just past */
/*  that breakpoint, 96px is too wide for the two forced <br /> lines   */
/*  to fit, so each one wraps again and the title reads as jampacked.   */
/*  Interpolating between a tablet-appropriate size and the full 96px   */
/*  (instead of snapping straight to it at md) fixes that without       */
/*  touching the mobile layout at all.                                  */
/* ------------------------------------------------------------------ */
const HERO_TITLE_VIEWPORT_MIN = 768;
const HERO_TITLE_VIEWPORT_MAX = 1440;

function fluidTitlePx(min: number, max: number): string {
  const slope = (max - min) / (HERO_TITLE_VIEWPORT_MAX - HERO_TITLE_VIEWPORT_MIN);
  const coefficient = slope * 100;
  const intercept = min - slope * HERO_TITLE_VIEWPORT_MIN;
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  const sign = coefficient < 0 ? "-" : "+";
  return `clamp(${lo}px, calc(${intercept.toFixed(2)}px ${sign} ${Math.abs(
    coefficient
  ).toFixed(2)}vw), ${hi}px)`;
}

const HERO_TITLE_SIZE = fluidTitlePx(48, 96);

function useTastePrefetch(field: "album" | "film" | "book", value: string) {
  // Tracks values already sent this session so backspacing/retyping the
  // same text doesn't refire — the debounce alone isn't enough for that
  // since it resets on every keystroke, not just new ones.
  const firedFor = useRef<Set<string>>(new Set());

  useEffect(() => {
    const trimmed = value.trim();
    if (trimmed.length < 2) return;

    const timeout = setTimeout(() => {
      const key = trimmed.toLowerCase();
      if (firedFor.current.has(key)) return;
      firedFor.current.add(key);
      triggerTasteScrape(field, trimmed);
    }, 700);

    return () => clearTimeout(timeout);
  }, [field, value]);
}

/* ------------------------------------------------------------------ */
/*  Hero section                                                       */
/* ------------------------------------------------------------------ */
const Hero = forwardRef<HTMLElement, HeroProps>(function Hero({ onSkipToWaitlist }, ref) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form Input States
  const [album, setAlbum] = useState("");
  const [film, setFilm] = useState("");
  const [book, setBook] = useState("");

  useTastePrefetch("album", album);
  useTastePrefetch("film", film);
  useTastePrefetch("book", book);

  // Whether each pick has actually been confirmed against the
  // suggestions API (picked from the dropdown, or typed out to an exact
  // match) — reported up by TasteAutocomplete itself, since it's the
  // one holding the fetched suggestion list to check against.
  const [fieldValidity, setFieldValidity] = useState<{
    album: boolean;
    film: boolean;
    book: boolean;
  }>({ album: false, film: false, book: false });

  const setFieldValid = (field: "album" | "film" | "book", valid: boolean) => {
    setFieldValidity((prev) => (prev[field] === valid ? prev : { ...prev, [field]: valid }));
  };

  // Forces every field's "not found" error to show even if the user
  // hasn't blurred that field yet — set the moment they try to submit
  // with something unconfirmed still sitting in a box.
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const heroFields = [
    { name: "album", label: "Album", value: album, onChange: setAlbum, placeholder: "An album only you seem to love *", width: 363 },
    { name: "film", label: "Film", value: film, onChange: setFilm, placeholder: "A film you'd give a 10 *", width: 264 },
    { name: "book", label: "Book", value: book, onChange: setBook, placeholder: "A book that changed how you think *", width: 363 },
  ];
  const heroInputClass =
    "h-[60px] rounded-full border border-white/10 bg-white/10 px-7 text-center text-[14px] font-medium leading-[1.25] tracking-[-0.025em] text-white placeholder:text-white/60 transition-colors hover:border-white/25 focus:outline-none focus:ring-1 focus:ring-white/30";

  // All three answers are required — the single source of truth both
  // submit buttons (desktop + mobile) disable against.
  const allFieldsFilled = album.trim() !== "" && film.trim() !== "" && book.trim() !== "";
  const allFieldsValid = fieldValidity.album && fieldValidity.film && fieldValidity.book;
  const canSubmitHero = allFieldsFilled && allFieldsValid;

  // Mobile: one field visible at a time behind a segmented tab switcher,
  // instead of three stacked boxes. Values live in the state above, so
  // switching tabs never loses what's already been typed.
  const [activeField, setActiveField] = useState<0 | 1 | 2>(0);
  const mobileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const hasInteracted = useRef(false);

  // Autofocus the newly-active field when the user taps a tab — but skip
  // the very first render, so the keyboard doesn't pop open the moment
  // the page loads.
  useEffect(() => {
    if (!hasInteracted.current) {
      hasInteracted.current = true;
      return;
    }
    mobileInputRefs.current[activeField]?.focus();
  }, [activeField]);

  const attemptOpen = () => {
    const emptyIndex = [album, film, book].findIndex((v) => v.trim() === "");
    if (emptyIndex !== -1) {
      setActiveField(emptyIndex as 0 | 1 | 2);
      mobileInputRefs.current[emptyIndex]?.focus();
      return;
    }
    if (!allFieldsValid) {
      setAttemptedSubmit(true);
      const invalidIndex = [fieldValidity.album, fieldValidity.film, fieldValidity.book].findIndex(
        (valid) => !valid
      );
      if (invalidIndex !== -1) {
        setActiveField(invalidIndex as 0 | 1 | 2);
        mobileInputRefs.current[invalidIndex]?.focus();
      }
      return;
    }
    setIsModalOpen(true);
  };

  const handleOpenModal = (e: React.FormEvent) => {
    e.preventDefault();
    attemptOpen();
  };

  const handleCloseModal = () => setIsModalOpen(false);

  const titleReveal = useReveal<HTMLHeadingElement>(0);
  const inputsReveal = useReveal<HTMLDivElement>(120);
  const submitReveal = useReveal<HTMLButtonElement>(200);
  const skipReveal = useReveal<HTMLButtonElement>(260);

  const titleRevealM = useReveal<HTMLHeadingElement>(0);
  const inputsRevealM = useReveal<HTMLDivElement>(120);
  const submitRevealM = useReveal<HTMLButtonElement>(200);
  const skipRevealM = useReveal<HTMLButtonElement>(260);

  return (
    <>
      <Navbar />
      <section
        ref={ref}
        className="relative flex w-full flex-col items-center text-center"
      >
        {/* Desktop — unchanged */}
        <div className="hidden min-h-screen w-full flex-col items-center justify-center px-6 pb-20 pt-28 md:flex">
          <h1
            ref={titleReveal.ref}
            className="mt-[50px] max-w-6xl font-medium leading-none tracking-[-0.025em]"
            style={{ fontFamily: "inherit", fontSize: HERO_TITLE_SIZE, ...titleReveal.style }}
          >
            Your taste either speaks
            <br />
            for itself or it doesn&apos;t.
          </h1>

          {/* Card fan — draggable: drag sideways to slot a card in
              anywhere among the 7, or drag it up and let go to shuffle
              it into a random new spot. */}
          <HeroCards />

          {/* Taste prompt form */}
          <form
            onSubmit={handleOpenModal}
            className="relative z-10 mt-5 flex w-full max-w-none flex-col items-center"
          >
            <div
              ref={inputsReveal.ref}
              className="flex flex-wrap items-center justify-center gap-[30px]"
              style={inputsReveal.style}
            >
              {heroFields.map((field) => (
                <TasteAutocomplete
                  key={field.name}
                  field={field.name as "album" | "film" | "book"}
                  name={field.name}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder={field.placeholder}
                  required
                  ariaRequired
                  onValidityChange={(valid) =>
                    setFieldValid(field.name as "album" | "film" | "book", valid)
                  }
                  showValidationErrors={attemptedSubmit}
                  wrapperStyle={{ width: 363 }}
                  inputStyle={{ width: 363, height: 60 }}
                  inputClassName="w-full rounded-[15px] border border-white/10 bg-[#F0F0F0]/20 px-7 text-center text-[14px] font-medium leading-[1.25] tracking-[-0.025em] text-white placeholder:text-white/60 transition-colors hover:border-white/25 hover:bg-[#F0F0F0]/28 focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/25"
                />
              ))}
            </div>

            <button
              ref={submitReveal.ref}
              type="submit"
              disabled={!canSubmitHero}
              className={`mt-8 h-[57px] w-[248px] rounded-[30px] text-[18px] font-semibold leading-[27px] tracking-[-0.05em] transition-all ${
                canSubmitHero
                  ? "bg-white text-black shadow-[0_8px_30px_-6px_rgba(255,255,255,0.25)] hover:scale-[1.02] hover:bg-white/90 active:scale-[0.98]"
                  : "bg-white/15 text-white/40 cursor-not-allowed"
              }`}
              style={submitReveal.style}
            >
              Find my match
            </button>

            {!canSubmitHero && (
              <p className="mt-3 text-[13px] font-medium text-white/40">
                {allFieldsFilled
                  ? "Pick a suggestion from the list for each field to continue"
                  : "Fill in all three fields to continue"}
              </p>
            )}

            <button
              ref={skipReveal.ref}
              type="button"
              onClick={onSkipToWaitlist}
              className="mt-5 text-[16px] font-medium leading-[24px] tracking-normal text-white/60 underline underline-offset-4 transition-colors hover:text-white"
              style={skipReveal.style}
            >
              Skip to waitlist
            </button>
          </form>
        </div>

        {/* Mobile — distinct layout: a tighter headline with one
            typographic accent, and a single morphing input driven by a
            segmented tab switcher instead of three stacked boxes. */}
        <div className="flex w-full flex-col items-center px-5 pb-16 pt-24 md:hidden">
          <h1
            ref={titleRevealM.ref}
            className="max-w-[23ch] font-medium leading-[1.25] tracking-[-0.02em] text-[28px]"
            style={{ fontFamily: "inherit", ...titleRevealM.style }}
          >
            Your taste either speaks for itself or it{" "}
            <span className="italic text-white/45">doesn&apos;t.</span>
          </h1>

          <div className="mt-9 w-full overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <HeroCards />
          </div>

          <form
            onSubmit={handleOpenModal}
            className="relative z-10 mt-9 flex w-full max-w-sm flex-col items-center"
          >
            <div
              ref={inputsRevealM.ref}
              className="w-full"
              style={inputsRevealM.style}
            >
              {/* Segmented tab switcher — one field in view at a time.
                  The dot fills in once that field has a value, so
                  progress is visible without needing all three fields
                  on screen at once. */}
              <div className="flex w-full rounded-full bg-white/10 p-1">
                {heroFields.map((field, i) => (
                  <button
                    key={field.name}
                    type="button"
                    onClick={() => setActiveField(i as 0 | 1 | 2)}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-[13px] font-semibold tracking-[-0.02em] transition-colors ${
                      activeField === i ? "bg-white text-black" : "text-white/60"
                    }`}
                  >
                    {field.label}
                    <span
                      className={`h-1.5 w-1.5 rounded-full transition-colors ${
                        field.value.trim()
                          ? activeField === i
                            ? "bg-black/40"
                            : "bg-white"
                          : "bg-transparent"
                      }`}
                    />
                  </button>
                ))}
              </div>

              {/* Crossfading input stack — all three stay mounted so
                  typed values are never lost, only the active one is
                  interactive and visible. */}
              <div className="relative mt-3 h-[56px] w-full">
                {heroFields.map((field, i) => (
                  <TasteAutocomplete
                    key={field.name}
                    field={field.name as "album" | "film" | "book"}
                    name={field.name}
                    value={field.value}
                    onChange={field.onChange}
                    inputRef={(el) => {
                      mobileInputRefs.current[i] = el;
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      e.preventDefault();
                      if (i < heroFields.length - 1) {
                        setActiveField((i + 1) as 0 | 1 | 2);
                      } else {
                        attemptOpen();
                      }
                    }}
                    placeholder={field.placeholder}
                    ariaRequired
                    onValidityChange={(valid) =>
                      setFieldValid(field.name as "album" | "film" | "book", valid)
                    }
                    showValidationErrors={attemptedSubmit}
                    tabIndex={activeField === i ? 0 : -1}
                    ariaHidden={activeField !== i}
                    // The crossfade (opacity/transform/pointer-events) and
                    // the absolute inset-0 stacking both move to the
                    // wrapper now, not the input, so all three overlap in
                    // the same spot and the dropdown anchors to whichever
                    // one is actually visible.
                    wrapperClassName="absolute inset-0 h-[56px] w-full"
                    wrapperStyle={{
                      opacity: activeField === i ? 1 : 0,
                      transform: activeField === i ? "translateY(0)" : "translateY(6px)",
                      pointerEvents: activeField === i ? "auto" : "none",
                      transition:
                        "opacity 0.35s cubic-bezier(0.16,1,0.3,1), transform 0.35s cubic-bezier(0.16,1,0.3,1)",
                    }}
                    inputClassName="h-[56px] w-full rounded-2xl border border-white/10 bg-[#F0F0F0]/10 px-6 text-center text-[15px] font-medium tracking-[-0.02em] text-white placeholder:text-white/60 transition-colors focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/25"
                  />
                ))}
              </div>
            </div>

            <button
              ref={submitRevealM.ref}
              type="submit"
              disabled={!canSubmitHero}
              className={`mt-7 h-[52px] w-full max-w-xs rounded-[30px] text-[16px] font-semibold tracking-[-0.02em] transition-all ${
                canSubmitHero
                  ? "bg-white text-black shadow-[0_8px_30px_-6px_rgba(255,255,255,0.25)] active:scale-[0.98]"
                  : "bg-white/15 text-white/40 cursor-not-allowed"
              }`}
              style={submitRevealM.style}
            >
              Find my match
            </button>

            {!canSubmitHero && (
              <p className="mt-3 text-[12px] font-medium text-white/40">
                {allFieldsFilled
                  ? "Pick a suggestion from the list for each field"
                  : "Fill in all three to continue"}
              </p>
            )}

            <button
              ref={skipRevealM.ref}
              type="button"
              onClick={onSkipToWaitlist}
              className="mt-4 text-[14px] font-medium text-white/60 underline underline-offset-4"
              style={skipRevealM.style}
            >
              Skip to waitlist
            </button>
          </form>
        </div>
      </section>

      <HeroModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        picks={{ album, film, book }}
      />
    </>
  );
});
Hero.displayName = "Hero";

export default Hero;