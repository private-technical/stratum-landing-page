"use client";

import { useEffect, useState } from "react";
import { isValidEmail, isValidUsername, EMAIL_ERROR, USERNAME_ERROR } from "./shared/validation";
import { REDIRECT_DELAY_MS } from "./shared/waitlist";
import { InviteCodeField } from "./shared/invite-code-field";
import { joinWaitlist, WaitlistJoinError } from "./shared/pocketbase";

interface HeroModalProps {
  isOpen: boolean;
  onClose: () => void;
  picks: { album: string; film: string; book: string };
}

// Sorts a thrown value into copy the user can act on. WaitlistJoinError
// already carries a specific, server-written reason (invite code invalid,
// username taken, and so on), so that message is used as-is. Everything
// else gets bucketed into the actual cause, offline, timed out, or a
// server problem, rather than a single "something went wrong" catch-all
// that leaves the user guessing whether retrying will even help.
function describeSubmitError(err: unknown): string {
  if (err instanceof WaitlistJoinError) {
    return err.message;
  }
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return "You're offline. Check your connection and try again.";
  }
  if (err instanceof DOMException && err.name === "AbortError") {
    return "That took too long. Try again.";
  }
  if (err instanceof TypeError) {
    // fetch throws a TypeError for network-level failures (DNS, CORS,
    // connection refused) rather than an HTTP error status.
    return "You're offline. Check your connection and try again.";
  }
  return "Our server hit a snag. Try again in a moment.";
}

export default function HeroModal({ isOpen, onClose, picks }: HeroModalProps) {
  // Two-step flow: email first (the low-friction ask), username second
  // (paired with the invite code, terms checkbox, and final submit).
  // Each step is its own mount rather than a shared crossfade stack, so
  // autoFocus just follows the active step — no refs or effects needed
  // to manage it.
  const [step, setStep] = useState<0 | 1>(0);
  const [isWaitlistSubmitted, setIsWaitlistSubmitted] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistUsername, setWaitlistUsername] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const emailError =
    emailTouched && waitlistEmail.trim() !== "" && !isValidEmail(waitlistEmail)
      ? EMAIL_ERROR
      : null;
  const usernameError =
    usernameTouched && waitlistUsername.trim() !== "" && !isValidUsername(waitlistUsername)
      ? USERNAME_ERROR
      : null;

  const canContinueStep0 = isValidEmail(waitlistEmail);
  const canSubmitStep1 = isValidUsername(waitlistUsername) && agreedToTerms;

  const handleClose = () => {
    onClose();
    setStep(0);
    setIsWaitlistSubmitted(false);
    setWaitlistEmail("");
    setWaitlistUsername("");
    setInviteCode("");
    setAgreedToTerms(false);
    setEmailTouched(false);
    setUsernameTouched(false);
    setIsSubmitting(false);
    setSubmitError(null);
    setAccessToken(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (step === 0) {
      if (!canContinueStep0) {
        setEmailTouched(true);
        return;
      }
      setStep(1);
      return;
    }
    if (!canSubmitStep1) {
      setUsernameTouched(true);
      return;
    }
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const normalizedEmail = waitlistEmail.trim().toLowerCase();
      const normalizedUsername = waitlistUsername.trim().toLowerCase();
      const result = await joinWaitlist({
        email: normalizedEmail,
        username: normalizedUsername,
        inviteCode: inviteCode.trim() || undefined,
        pickAlbum: picks.album,
        pickFilm: picks.film,
        pickBook: picks.book,
      });
      setWaitlistEmail(normalizedEmail);
      setWaitlistUsername(normalizedUsername);
      setAccessToken(result.accessToken);
      setIsWaitlistSubmitted(true);
    } catch (err) {
      if (err instanceof WaitlistJoinError && err.field === "username") {
        setUsernameTouched(true);
      }
      setSubmitError(describeSubmitError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Once the verification screen is showing, automatically send the user
  // on to their matches page — same behavior as Section 2's waitlist flow.
  // Goes through /api/waitlist/access (the same route the emailed link
  // uses) rather than router.push straight to /[username]: this makes
  // the session-cookie step a real navigation/HTTP round-trip instead of
  // a background fetch sequenced through component state, so it can't be
  // interrupted by a dev-mode Fast Refresh remount mid-request.
  useEffect(() => {
    if (!isWaitlistSubmitted || !waitlistUsername || !accessToken) return;

    const timeout = setTimeout(() => {
      window.location.href = `/api/waitlist/access?username=${encodeURIComponent(waitlistUsername)}&token=${encodeURIComponent(accessToken)}`;
    }, REDIRECT_DELAY_MS);

    return () => clearTimeout(timeout);
  }, [isWaitlistSubmitted, waitlistUsername, accessToken]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4 transition-all duration-300 animate-in fade-in"
      onClick={handleClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="waitlist-heading"
        className="relative w-full max-w-[420px] animate-in zoom-in-95 duration-200 rounded-[28px] border border-white/10 bg-[#111111] p-10 text-center shadow-[0_25px_70px_-15px_rgba(0,0,0,0.7)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close"
          className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/10 hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        {!isWaitlistSubmitted ? (
          <>
            {/* Progress — two thin segments instead of "Step 1 of 2" text.
                Reads as momentum rather than a form to get through. */}
            <div className="mx-auto flex w-[64px] gap-1.5">
              <span className={`h-[3px] flex-1 rounded-full transition-colors duration-300 ${step >= 0 ? "bg-white" : "bg-white/15"}`} />
              <span className={`h-[3px] flex-1 rounded-full transition-colors duration-300 ${step >= 1 ? "bg-white" : "bg-white/15"}`} />
            </div>

            <h2
              id="waitlist-heading"
              className="mt-6 text-[26px] font-bold leading-tight tracking-[-0.02em] text-white"
            >
              See who you match with.
            </h2>
            <p className="mx-auto mt-2 max-w-[300px] text-[14px] leading-[1.5] text-white/55">
              {step === 0
                ? "Drop your email to reserve a spot on Stratum."
                : "Now claim your @username to lock it in."}
            </p>

            <form className="mt-8" onSubmit={handleSubmit} key={step} noValidate>
              {step === 0 ? (
                <div className="flex flex-col gap-3.5 animate-in fade-in slide-in-from-right-2 duration-300">
                  {/* Single field, embedded CTA — the only thing being
                      asked for right now is an email, so the whole step
                      is one pill instead of a field-then-button pair. */}
                  <div
                    className={`flex h-[58px] w-full items-center rounded-full bg-white/10 py-1.5 pl-6 pr-1.5 ${
                      emailError
                        ? "ring-1 ring-red-400/70 focus-within:ring-red-400/70"
                        : "focus-within:ring-1 focus-within:ring-white/30"
                    }`}
                  >
                    <input
                      type="email"
                      name="email"
                      required
                      aria-required="true"
                      aria-invalid={Boolean(emailError)}
                      autoFocus
                      value={waitlistEmail}
                      onChange={(e) => setWaitlistEmail(e.target.value)}
                      onBlur={() => setEmailTouched(true)}
                      placeholder="Email address *"
                      className="h-full w-full border-0 bg-transparent text-[14px] font-medium text-white placeholder:text-white/40 selection:bg-white/25 selection:text-white focus:outline-none autofill:[-webkit-text-fill-color:white] autofill:[-webkit-box-shadow:0_0_0_1000px_rgb(41,41,41)_inset] autofill:[transition:background-color_9999s_ease-in-out_0s]"
                    />
                    <button
                      type="submit"
                      aria-label="Continue"
                      disabled={!canContinueStep0}
                      className={`flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full transition-transform ${
                        canContinueStep0
                          ? "bg-white text-black hover:scale-105 active:scale-95"
                          : "bg-white/15 text-white/30 cursor-not-allowed"
                      }`}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </button>
                  </div>

                  {emailError ? (
                    <p className="px-2 text-left text-[12px] font-medium text-red-400" role="alert">
                      {emailError}
                    </p>
                  ) : (
                    !canContinueStep0 && (
                      <p className="px-2 text-left text-[12px] font-medium text-white/35">
                        Enter a valid email to continue
                      </p>
                    )
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-3.5 animate-in fade-in slide-in-from-right-2 duration-300">
                  <div
                    className={`flex h-[54px] w-full items-center rounded-full bg-white/10 px-6 ${
                      usernameError
                        ? "ring-1 ring-red-400/70 focus-within:ring-red-400/70"
                        : "focus-within:ring-1 focus-within:ring-white/30"
                    }`}
                  >
                    <span className="text-[14px] font-medium text-white/40">@</span>
                    <input
                      type="text"
                      name="username"
                      required
                      aria-required="true"
                      aria-invalid={Boolean(usernameError)}
                      autoFocus
                      value={waitlistUsername}
                      onChange={(e) => setWaitlistUsername(e.target.value)}
                      onBlur={() => setUsernameTouched(true)}
                      placeholder="username *"
                      className="w-full border-0 bg-transparent pl-1 text-[14px] font-medium text-white placeholder:text-white/40 selection:bg-white/25 selection:text-white focus:outline-none autofill:[-webkit-text-fill-color:white] autofill:[-webkit-box-shadow:0_0_0_1000px_rgb(41,41,41)_inset] autofill:[transition:background-color_9999s_ease-in-out_0s]"
                    />
                  </div>

                  {usernameError && (
                    <p className="px-2 text-left text-[12px] font-medium text-red-400" role="alert">
                      {usernameError}
                    </p>
                  )}

                  <div className="flex justify-center">
                    <InviteCodeField value={inviteCode} onChange={setInviteCode} />
                  </div>

                  <label className="mt-2 flex cursor-pointer items-start gap-3 text-left group">
                    <div className="relative mt-[2px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] border-[2px] border-white/25 bg-transparent transition-all group-hover:border-white/50 has-[:checked]:border-white has-[:checked]:bg-white">
                      <input
                        type="checkbox"
                        required
                        aria-required="true"
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                        className="peer sr-only"
                      />
                      <svg
                        className="pointer-events-none hidden h-3 w-3 text-black peer-checked:block"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-[12.5px] leading-[17px] text-white/50 transition-colors group-hover:text-white/75">
                      I agree to the Terms of Service and consent to receive updates from Stratum. *
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={!canSubmitStep1 || isSubmitting}
                    className={`mt-3 h-[54px] w-full rounded-full text-[15px] font-semibold tracking-[-0.01em] transition-all ${
                      canSubmitStep1 && !isSubmitting
                        ? "bg-white text-black hover:scale-[1.01] hover:bg-white/90 active:scale-[0.98]"
                        : "bg-white/15 text-white/40 cursor-not-allowed"
                    }`}
                  >
                    {isSubmitting ? "Joining..." : "See matches"}
                  </button>

                  {!canSubmitStep1 && (
                    <p className="text-[12px] font-medium text-white/35">
                      {isValidUsername(waitlistUsername)
                        ? "Agree to the terms to continue"
                        : "Claim a username to continue"}
                    </p>
                  )}

                  {submitError && (
                    <p className="text-[12px] font-medium text-red-400" role="alert">
                      {submitError}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => setStep(0)}
                    className="mx-auto mt-1 flex items-center gap-1 text-[12.5px] font-medium text-white/40 transition-colors hover:text-white/70"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 6l-6 6 6 6" />
                    </svg>
                    Back
                  </button>
                </div>
              )}
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 id="waitlist-heading" className="mt-5 text-[22px] font-bold tracking-[-0.02em] text-white">
              You&apos;re on the list.
            </h2>
            <p className="mx-auto mt-2 max-w-[280px] text-[14px] leading-[1.5] text-white/55">
              We&apos;ll email <span className="text-white/85">{waitlistEmail || "you"}</span> when your matches are ready.
            </p>
            {accessToken && (
              <p className="mt-1 text-[13px] leading-[1.5] text-white/35">
                Taking you to your matches now&hellip;
              </p>
            )}

            <button
              type="button"
              onClick={() => { if (accessToken) window.location.href = `/api/waitlist/access?username=${encodeURIComponent(waitlistUsername)}&token=${encodeURIComponent(accessToken)}`; }}
              disabled={!accessToken}
              aria-disabled={!accessToken}
              className={`mt-7 h-[50px] w-full rounded-full border text-[14px] font-semibold transition-colors ${
                accessToken
                  ? "border-white/15 text-white/80 hover:bg-white/5 hover:text-white"
                  : "border-white/10 text-white/30 cursor-not-allowed"
              }`}
            >
              View my matches now
            </button>

            {!accessToken && (
              <p className="mt-3 text-[12px] font-medium text-white/35" role="alert">
                We&apos;re still setting up your link. We&apos;ll also email it to you.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}