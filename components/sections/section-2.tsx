"use client";

import { forwardRef, useEffect, useState } from "react";
import { RevealImage } from "../shared/reveal-image";
import { useReveal } from "../shared/use-reveal";
import { isValidEmail, isValidUsername, EMAIL_ERROR, USERNAME_ERROR } from "../shared/validation";
import { REDIRECT_DELAY_MS } from "../shared/waitlist";
import { InviteCodeField } from "../shared/invite-code-field";
import { joinWaitlist, WaitlistJoinError } from "../shared/pocketbase";
import { useWaitlistCount } from "../shared/use-waitlist-count";
import type { FanCard } from "../shared/types";

/* ------------------------------------------------------------------ */
/*  Section 2: Waitlist                                                */
/* ------------------------------------------------------------------ */
const WAITLIST_CARDS: FanCard[] = [
  {
    id: "red-poster",
    src: "https://res.cloudinary.com/cgyxai8a/image/upload/v1783410561/Rectangle_64_judoww.png",
    alt: "Red-toned film poster",
    x: -60,
    y: 26.22,
    width: 480,
    height: 450,
    zIndexOverride: 10,
  },
  {
    id: "creative-act",
    src: "https://res.cloudinary.com/cgyxai8a/image/upload/v1783410561/Rectangle_65_gykr6l.png",
    alt: "The Creative Act: A Way of Being book cover",
    x: 320,
    y: -70,
    width: 420,
    height: 500,
    zIndexOverride: 7,
  },
  {
    id: "toy-story-5",
    src: "https://res.cloudinary.com/cgyxai8a/image/upload/v1783410561/Rectangle_66_bcramn.png",
    alt: "Toy Story 5 poster",
    x: 470,
    y: -72,
    width: 380,
    height: 410,
    zIndexOverride: 6,
  },
  {
    id: "doac-portrait",
    src: "https://res.cloudinary.com/cgyxai8a/image/upload/v1783410562/Rectangle_69_zbzkmo.png",
    alt: "Portrait wearing an DOAC branded t-shirt",
    x: 730,
    y: -22.78,
    width: 355.02,
    height: 336.28,
  },
  {
    id: "the-hobbit",
    src: "https://res.cloudinary.com/cgyxai8a/image/upload/v1783410561/Rectangle_68_lewbhe.png",
    alt: "The Hobbit book cover",
    x: 950.96,
    y: -40.22,
    width: 330,
    height: 330,
    zIndexOverride: 0,
  },
  {
    id: "dune-part-three",
    src: "https://res.cloudinary.com/cgyxai8a/image/upload/v1783410562/Rectangle_67_da1izf.png",
    alt: "Dune Part Three poster",
    x: 960,
    y: 20,
    width: 395,
    height: 410,
    zIndexOverride: 10,
  },
];

// Doubled for a seamless marquee loop — translating the track by exactly
// -50% always lands on an identical frame to the start, regardless of the
// actual rendered pixel width, since each half is guaranteed identical.
const WAITLIST_CARDS_LOOP = [...WAITLIST_CARDS, ...WAITLIST_CARDS];

const Section2 = forwardRef<HTMLElement>(function Section2(_props, ref) {
  const waitlistCount = useWaitlistCount();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const emailError =
    emailTouched && email.trim() !== "" && !isValidEmail(email) ? EMAIL_ERROR : null;
  const usernameError =
    usernameTouched && username.trim() !== "" && !isValidUsername(username)
      ? USERNAME_ERROR
      : null;
  const canSubmit = isValidEmail(email) && isValidUsername(username);

  const handleJoinWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      setEmailTouched(true);
      setUsernameTouched(true);
      return;
    }
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedUsername = username.trim().toLowerCase();
      const result = await joinWaitlist({
        email: normalizedEmail,
        username: normalizedUsername,
        inviteCode: inviteCode.trim() || undefined,
      });
      setEmail(normalizedEmail);
      setUsername(normalizedUsername);
      setAccessToken(result.accessToken);
      setIsSubmitted(true);
    } catch (err) {
      if (err instanceof WaitlistJoinError) {
        if (err.field === "email") setEmailTouched(true);
        if (err.field === "username") setUsernameTouched(true);
        setSubmitError(err.message);
      } else {
        setSubmitError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Once the confirmation screen is showing, automatically send the user
  // on to their matches page — same behavior as the Hero's modal flow.
  // Goes through /api/waitlist/access (the same route the emailed link
  // uses) rather than router.push straight to /[username]: this makes
  // the session-cookie step a real navigation/HTTP round-trip instead of
  // a background fetch sequenced through component state, so it can't be
  // interrupted by a dev-mode Fast Refresh remount mid-request.
  useEffect(() => {
    if (!isSubmitted || !username || !accessToken) return;

    const timeout = setTimeout(() => {
      window.location.href = `/api/waitlist/access?username=${encodeURIComponent(username)}&token=${encodeURIComponent(accessToken)}`;
    }, REDIRECT_DELAY_MS);

    return () => clearTimeout(timeout);
  }, [isSubmitted, username, accessToken]);

  const headingReveal = useReveal<HTMLHeadingElement>(0);
  const inputsReveal = useReveal<HTMLDivElement>(120);
  const buttonReveal = useReveal<HTMLButtonElement>(200);
  const countReveal = useReveal<HTMLParagraphElement>(260);

  const headingRevealM = useReveal<HTMLHeadingElement>(0);
  const inputsRevealM = useReveal<HTMLDivElement>(120);
  const buttonRevealM = useReveal<HTMLButtonElement>(200);
  const countRevealM = useReveal<HTMLParagraphElement>(260);

  // Tablet / small-laptop reveal refs (new — same timing as the other two tiers)
  const headingRevealT = useReveal<HTMLHeadingElement>(0);
  const inputsRevealT = useReveal<HTMLDivElement>(120);
  const buttonRevealT = useReveal<HTMLButtonElement>(200);
  const countRevealT = useReveal<HTMLParagraphElement>(260);

  // Every card is positioned with real absolute left/top derived straight
  // from its own x/y/width/height. Nothing here reads another card's
  // dimensions, so resizing or repositioning one card can never shift any
  // other card. minX/minY just translate the whole group so it starts at
  // (0,0) inside its wrapper; contentWidth/contentHeight size that wrapper
  // so the section reserves enough room (this grows automatically if a
  // card gets taller/wider, but that never moves the other cards).
  const minX = Math.min(...WAITLIST_CARDS.map((c) => c.x));
  const minY = Math.min(...WAITLIST_CARDS.map((c) => c.y));
  const contentWidth =
    Math.max(...WAITLIST_CARDS.map((c) => c.x + c.width)) - minX;
  const contentHeight =
    Math.max(...WAITLIST_CARDS.map((c) => c.y + c.height)) - minY;

  const mobileInputClass = (hasError: boolean) =>
    `w-full h-[54px] rounded-2xl border-0 bg-[#F0F0F0]/15 px-5 text-center text-[15px] font-medium tracking-[-0.02em] text-white placeholder:text-white/50 focus:outline-none focus:ring-1 ${
      hasError ? "ring-1 ring-red-400/70 focus:ring-red-400/70" : "focus:ring-white/30"
    }`;

  // Mobile card marquee: every card keeps its own true aspect ratio,
  // scaled to a shared height — nothing is cropped or squeezed into a
  // uniform box, so posters stay posters and square covers stay square.
  const MOBILE_CARD_HEIGHT = 180;

  // Same marquee, sized up for the tablet/small-laptop band (see below —
  // the desktop card fan's absolute Figma positions run well past 1024px
  // wide, so tablet reuses this scrolling pattern instead at a taller row
  // height than mobile gets.
  const TABLET_CARD_HEIGHT = 240;

  return (
    <section
      ref={ref}
      className="relative w-full overflow-hidden bg-black"
    >
      <style>{`
        @keyframes stratum-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .stratum-marquee-track {
          animation: stratum-marquee 32s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .stratum-marquee-track {
            animation: none;
          }
        }
      `}</style>

      {/* Desktop (≥1280px) — unchanged design, just now gated behind xl
          instead of md so the md–xl band below can get its own layout */}
      <div className="relative hidden px-6 pb-40 xl:block" style={{ paddingTop: 109 }}>
        {/* Screaming head - left edge */}
        <RevealImage
          src="https://res.cloudinary.com/cgyxai8a/image/upload/v1783410561/image_69_uckmh4.png"
          alt=""
          aria-hidden
          width={410}
          height={651}
          className="pointer-events-none absolute select-none object-contain"
          style={{ left: 80, top: 80 }}
        />

        {/* Calm head - right edge */}
        <RevealImage
          src="https://res.cloudinary.com/cgyxai8a/image/upload/v1783410561/image_68_iqa6wp.png"
          alt=""
          aria-hidden
          width={520}
          height={620}
          delay={80}
          className="pointer-events-none absolute select-none object-contain"
          style={{ right: 100, top: 40 }}
        />

        {/* Waitlist content */}
        <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center text-center">
          {!isSubmitted ? (
            <>
              <h2
                ref={headingReveal.ref}
                className="max-w-4xl font-medium leading-none tracking-[-0.02em] text-[86px] text-white"
                style={{ fontFamily: "inherit", ...headingReveal.style }}
              >
                Reserve your spot on
                <br />
                Stratum
              </h2>

              <form
                onSubmit={handleJoinWaitlist}
                className="mt-10 flex flex-col items-center"
                noValidate
              >
                <div
                  ref={inputsReveal.ref}
                  className="flex flex-col items-center gap-5"
                  style={inputsReveal.style}
                >
                  <div className="flex flex-col items-center gap-1.5">
                    <input
                      type="email"
                      name="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={() => setEmailTouched(true)}
                      placeholder="Enter your email *"
                      required
                      aria-required="true"
                      aria-invalid={Boolean(emailError)}
                      style={{ width: 363, height: 60 }}
                      className={`rounded-[15px] border-0 bg-[#F0F0F0]/20 px-7 text-center text-[14px] font-medium leading-[1.25] tracking-[-0.025em] text-white placeholder:text-white focus:outline-none focus:ring-1 ${
                        emailError ? "ring-1 ring-red-400/70 focus:ring-red-400/70" : "focus:ring-white/30"
                      }`}
                    />
                    {emailError && (
                      <p className="w-[363px] text-left text-[12px] font-medium text-red-400" role="alert">
                        {emailError}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-center gap-1.5">
                    <input
                      type="text"
                      name="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onBlur={() => setUsernameTouched(true)}
                      placeholder="Reserve a username *"
                      required
                      aria-required="true"
                      aria-invalid={Boolean(usernameError)}
                      style={{ width: 363, height: 60 }}
                      className={`rounded-[15px] border-0 bg-[#F0F0F0]/20 px-7 text-center text-[14px] font-medium leading-[1.25] tracking-[-0.025em] text-white placeholder:text-white focus:outline-none focus:ring-1 ${
                        usernameError ? "ring-1 ring-red-400/70 focus:ring-red-400/70" : "focus:ring-white/30"
                      }`}
                    />
                    {usernameError && (
                      <p className="w-[363px] text-left text-[12px] font-medium text-red-400" role="alert">
                        {usernameError}
                      </p>
                    )}
                  </div>

                  <div style={{ width: 363 }} className="flex justify-center">
                    <InviteCodeField value={inviteCode} onChange={setInviteCode} />
                  </div>
                </div>

                <button
                  ref={buttonReveal.ref}
                  type="submit"
                  disabled={!canSubmit || isSubmitting}
                  style={{ marginTop: 40, width: 170, height: 43, ...buttonReveal.style }}
                  className={`rounded-[30px] border-0 text-[18px] font-semibold leading-[1.5] tracking-[-0.05em] transition-transform ${
                    canSubmit && !isSubmitting
                      ? "bg-white text-black hover:scale-[1.02] active:scale-[0.98]"
                      : "bg-white/15 text-white/40 cursor-not-allowed"
                  }`}
                >
                  {isSubmitting ? "Joining..." : "Join Waitlist"}
                </button>

                {!canSubmit && (
                  <p className="mt-3 text-[12px] font-medium text-white/40">
                    Enter a valid email and username to continue
                  </p>
                )}

                {submitError && (
                  <p className="mt-3 text-[12px] font-medium text-red-400" role="alert">
                    {submitError}
                  </p>
                )}
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
                <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="mt-7 font-medium leading-none tracking-[-0.02em] text-[56px] text-white">
                You&apos;re on the list.
              </h2>
              <p className="mx-auto mt-4 max-w-[420px] text-[16px] leading-[1.5] text-white/60">
                Check your inbox at <span className="text-white/90">{email}</span> for your private link.
              </p>
              <p className="mt-1 text-[14px] text-white/35">
                Taking you to your matches now&hellip;
              </p>
              <button
                type="button"
                onClick={() => { if (accessToken) window.location.href = `/api/waitlist/access?username=${encodeURIComponent(username)}&token=${encodeURIComponent(accessToken)}`; }}
                className="mt-8 h-[50px] rounded-full border border-white/15 px-8 text-[15px] font-semibold text-white/80 transition-colors hover:bg-white/5 hover:text-white"
              >
                View my matches now
              </button>
            </div>
          )}
        </div>

        {/* Card fan - each card absolutely positioned, fully independent */}
        <div
          className="relative z-10 mx-auto mt-24"
          style={{ width: contentWidth, height: contentHeight }}
          aria-hidden="true"
        >
          {WAITLIST_CARDS.map((card, i) => (
            <RevealImage
              key={card.id}
              src={card.src}
              alt={card.alt}
              width={card.width}
              height={card.height}
              delay={i * 50}
              style={{
                position: "absolute",
                left: card.x - minX,
                top: card.y - minY,
                zIndex: card.zIndexOverride ?? i + 1,
              }}
              className="object-contain drop-shadow-[0_30px_40px_rgba(0,0,0,0.55)]"
            />
          ))}
        </div>
      </div>

      {/* Tablet & small-laptop (~768px–1279px) — new. The desktop block's
          two flanking head images and its card fan are both positioned
          from fixed pixel/Figma coordinates tuned for much wider
          viewports, so neither fits here without colliding with the
          centered content. This tier drops the flanking images (same
          call mobile already makes) and reuses mobile's scrolling card
          marquee at a taller row height, on top of a fluid heading. */}
      <div className="relative hidden px-8 pb-24 md:block xl:hidden" style={{ paddingTop: 88 }}>
        <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center text-center">
          {!isSubmitted ? (
            <>
              <h2
                ref={headingRevealT.ref}
                className="max-w-2xl font-medium leading-[1.05] tracking-[-0.02em] text-[clamp(40px,6vw,68px)] text-white"
                style={{ fontFamily: "inherit", ...headingRevealT.style }}
              >
                Reserve your spot on
                <br />
                Stratum
              </h2>

              <form
                onSubmit={handleJoinWaitlist}
                className="mt-8 flex w-full max-w-sm flex-col items-center"
                noValidate
              >
                <div
                  ref={inputsRevealT.ref}
                  className="flex w-full flex-col items-center gap-4"
                  style={inputsRevealT.style}
                >
                  <div className="flex w-full flex-col items-center gap-1.5">
                    <input
                      type="email"
                      name="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={() => setEmailTouched(true)}
                      placeholder="Enter your email *"
                      required
                      aria-required="true"
                      aria-invalid={Boolean(emailError)}
                      className={`h-[58px] w-full rounded-[15px] border-0 bg-[#F0F0F0]/20 px-7 text-center text-[14px] font-medium leading-[1.25] tracking-[-0.025em] text-white placeholder:text-white focus:outline-none focus:ring-1 ${
                        emailError ? "ring-1 ring-red-400/70 focus:ring-red-400/70" : "focus:ring-white/30"
                      }`}
                    />
                    {emailError && (
                      <p className="w-full text-left text-[12px] font-medium text-red-400" role="alert">
                        {emailError}
                      </p>
                    )}
                  </div>

                  <div className="flex w-full flex-col items-center gap-1.5">
                    <input
                      type="text"
                      name="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onBlur={() => setUsernameTouched(true)}
                      placeholder="Reserve a username *"
                      required
                      aria-required="true"
                      aria-invalid={Boolean(usernameError)}
                      className={`h-[58px] w-full rounded-[15px] border-0 bg-[#F0F0F0]/20 px-7 text-center text-[14px] font-medium leading-[1.25] tracking-[-0.025em] text-white placeholder:text-white focus:outline-none focus:ring-1 ${
                        usernameError ? "ring-1 ring-red-400/70 focus:ring-red-400/70" : "focus:ring-white/30"
                      }`}
                    />
                    {usernameError && (
                      <p className="w-full text-left text-[12px] font-medium text-red-400" role="alert">
                        {usernameError}
                      </p>
                    )}
                  </div>

                  <div className="flex w-full justify-center">
                    <InviteCodeField value={inviteCode} onChange={setInviteCode} />
                  </div>
                </div>

                <button
                  ref={buttonRevealT.ref}
                  type="submit"
                  disabled={!canSubmit || isSubmitting}
                  style={{ ...buttonRevealT.style }}
                  className={`mt-8 h-[48px] w-[190px] rounded-[30px] border-0 text-[16px] font-semibold leading-[1.5] tracking-[-0.05em] transition-transform ${
                    canSubmit && !isSubmitting
                      ? "bg-white text-black hover:scale-[1.02] active:scale-[0.98]"
                      : "bg-white/15 text-white/40 cursor-not-allowed"
                  }`}
                >
                  {isSubmitting ? "Joining..." : "Join Waitlist"}
                </button>

                {!canSubmit && (
                  <p className="mt-3 text-[12px] font-medium text-white/40">
                    Enter a valid email and username to continue
                  </p>
                )}

                {submitError && (
                  <p className="mt-3 text-[12px] font-medium text-red-400" role="alert">
                    {submitError}
                  </p>
                )}
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="mt-6 font-medium leading-none tracking-[-0.02em] text-[42px] text-white">
                You&apos;re on the list.
              </h2>
              <p className="mx-auto mt-4 max-w-[380px] text-[15px] leading-[1.5] text-white/60">
                Check your inbox at <span className="text-white/90">{email}</span> for your private link.
              </p>
              <p className="mt-1 text-[13px] text-white/35">
                Taking you to your matches now&hellip;
              </p>
              <button
                type="button"
                onClick={() => { if (accessToken) window.location.href = `/api/waitlist/access?username=${encodeURIComponent(username)}&token=${encodeURIComponent(accessToken)}`; }}
                className="mt-8 h-[48px] rounded-full border border-white/15 px-8 text-[14px] font-semibold text-white/80 transition-colors hover:bg-white/5 hover:text-white"
              >
                View my matches now
              </button>
            </div>
          )}
        </div>

        {/* Same scrolling card marquee mobile uses, just a taller row */}
        <div className="relative mt-16 w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)] [-webkit-mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
          <div className="stratum-marquee-track flex w-max items-center gap-5 py-3">
            {WAITLIST_CARDS_LOOP.map((card, i) => {
              const isDuplicate = i >= WAITLIST_CARDS.length;
              const width = Math.round(
                TABLET_CARD_HEIGHT * (card.width / card.height)
              );
              return (
                <RevealImage
                  key={`${card.id}-${i}-t`}
                  src={card.src}
                  alt={card.alt}
                  aria-hidden={isDuplicate || undefined}
                  width={width}
                  height={TABLET_CARD_HEIGHT}
                  delay={(i % WAITLIST_CARDS.length) * 50}
                  className="shrink-0 rounded-2xl object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.45)]"
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile — real stacked layout, auto-scrolling card marquee */}
      <div className="flex w-full flex-col items-center px-5 pb-20 pt-16 md:hidden">
        {!isSubmitted ? (
          <>
            <h2
              ref={headingRevealM.ref}
              className="max-w-[19ch] font-medium leading-[1.3] tracking-[-0.02em] text-[28px] text-white/55"
              style={{ fontFamily: "inherit", ...headingRevealM.style }}
            >
              Reserve your spot on <span className="text-white">Stratum</span>
            </h2>

            <form
              onSubmit={handleJoinWaitlist}
              className="mt-8 flex w-full max-w-sm flex-col items-center"
              noValidate
            >
              <div
                ref={inputsRevealM.ref}
                className="flex w-full flex-col items-stretch gap-4"
                style={inputsRevealM.style}
              >
                <div className="flex w-full flex-col gap-1.5">
                  <input
                    type="email"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setEmailTouched(true)}
                    placeholder="Enter your email *"
                    required
                    aria-required="true"
                    aria-invalid={Boolean(emailError)}
                    className={mobileInputClass(Boolean(emailError))}
                  />
                  {emailError && (
                    <p className="px-2 text-left text-[11.5px] font-medium text-red-400" role="alert">
                      {emailError}
                    </p>
                  )}
                </div>

                <div className="flex w-full flex-col gap-1.5">
                  <input
                    type="text"
                    name="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onBlur={() => setUsernameTouched(true)}
                    placeholder="Reserve a username *"
                    required
                    aria-required="true"
                    aria-invalid={Boolean(usernameError)}
                    className={mobileInputClass(Boolean(usernameError))}
                  />
                  {usernameError && (
                    <p className="px-2 text-left text-[11.5px] font-medium text-red-400" role="alert">
                      {usernameError}
                    </p>
                  )}
                </div>

                <div className="flex w-full justify-center">
                  <InviteCodeField value={inviteCode} onChange={setInviteCode} />
                </div>
              </div>

              <button
                ref={buttonRevealM.ref}
                type="submit"
                disabled={!canSubmit || isSubmitting}
                style={buttonRevealM.style}
                className={`mt-6 h-[48px] w-full max-w-[220px] rounded-[30px] border-0 text-[15px] font-semibold tracking-[-0.02em] transition-transform ${
                  canSubmit && !isSubmitting
                    ? "bg-white text-black active:scale-[0.98]"
                    : "bg-white/15 text-white/40 cursor-not-allowed"
                }`}
              >
                {isSubmitting ? "Joining..." : "Join Waitlist"}
              </button>

              {!canSubmit && (
                <p className="mt-3 text-[11.5px] font-medium text-white/40">
                  Enter a valid email and username to continue
                </p>
              )}

              {submitError && (
                <p className="mt-3 text-[11.5px] font-medium text-red-400" role="alert">
                  {submitError}
                </p>
              )}
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mt-6 font-medium tracking-[-0.02em] text-[26px] text-white">
              You&apos;re on the list.
            </h2>
            <p className="mx-auto mt-3 max-w-[28ch] text-[14px] leading-[1.5] text-white/60">
              Check your inbox at <span className="text-white/90">{email}</span> for your private link.
            </p>
            <p className="mt-1 text-[13px] text-white/35">
              Taking you to your matches now&hellip;
            </p>
            <button
              type="button"
              onClick={() => { if (accessToken) window.location.href = `/api/waitlist/access?username=${encodeURIComponent(username)}&token=${encodeURIComponent(accessToken)}`; }}
              className="mt-7 h-[46px] w-full max-w-[240px] rounded-full border border-white/15 text-[14px] font-semibold text-white/80 transition-colors hover:bg-white/5 hover:text-white"
            >
              View my matches now
            </button>
          </div>
        )}

        {/* Edges fade via mask instead of hard-clipping, so cards drift
            in and out of the marquee rather than snapping off-screen. */}
        <div className="relative mt-12 w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)] [-webkit-mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
          <div className="stratum-marquee-track flex w-max items-center gap-4 py-3">
            {WAITLIST_CARDS_LOOP.map((card, i) => {
              const isDuplicate = i >= WAITLIST_CARDS.length;
              const width = Math.round(
                MOBILE_CARD_HEIGHT * (card.width / card.height)
              );
              return (
                <RevealImage
                  key={`${card.id}-${i}`}
                  src={card.src}
                  alt={card.alt}
                  aria-hidden={isDuplicate || undefined}
                  width={width}
                  height={MOBILE_CARD_HEIGHT}
                  delay={(i % WAITLIST_CARDS.length) * 50}
                  className="shrink-0 rounded-2xl object-contain drop-shadow-[0_16px_24px_rgba(0,0,0,0.5)]"
                />
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
});
Section2.displayName = "Section2";

export default Section2;