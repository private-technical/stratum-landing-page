"use client";

import { useEffect, useRef, useState } from "react";
import { Poppins } from "next/font/google";
import Navbar from "../../components/navbar";
import type { WaitlistUserWithMatches } from "../../components/shared/pocketbase-server";
import { SOURCE_LABEL } from "../../components/shared/taste-types";
import { TasteAutocomplete } from "../../components/shared/taste-autocomplete";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

// inviteCode/inviteExpiresAt now come straight from WaitlistUserWithMatches
// itself (see pocketbase-server.ts), so no extra intersection type is
// needed here anymore.
type MatchesUser = WaitlistUserWithMatches;

/* ------------------------------------------------------------------ */
/*  Taste rarity: niche vs. common                                     */
/*  A source counts as "niche" when its match count sits under the     */
/*  given cutoff for that platform. With three sources, a majority     */
/*  (>=2) of niche results puts the whole result on the niche path;    */
/*  otherwise it's common — written as a majority check rather than a  */
/*  hardcoded "2 of 3" so it still behaves if a source is ever missing.*/
/* ------------------------------------------------------------------ */
const NICHE_CUTOFFS: Record<string, number> = {
  letterboxd: 5000,
  goodreads: 10000,
  rateyourmusic: 2000,
};

function isNicheMatch(source: string, matchCount: number) {
  const cutoff = NICHE_CUTOFFS[source] ?? 0;
  return matchCount < cutoff;
}

function getTastePath(
  matches: { source: string; matchCount: number }[]
): "niche" | "common" | null {
  if (matches.length === 0) return null;
  const nicheCount = matches.filter((m) =>
    isNicheMatch(m.source, m.matchCount)
  ).length;
  return nicheCount >= Math.ceil(matches.length / 2) ? "niche" : "common";
}

// Brightens just the numbers that carry the actual stakes (the cap, the
// friend count, the deadline) against the surrounding white/70 sentence,
// so someone skimming catches the terms without reading every word.
function Highlight({ children }: { children: React.ReactNode }) {
  return <span className="font-semibold text-white">{children}</span>;
}

// Two things dominate this card: the deadline (its own timer widget, not
// buried in a sentence) and "invite 3 friends" (the headline). Everything
// else — cap, consequence, rarity framing — drops to one secondary line
// so a scan catches the ask in under a second instead of parsing a
// four-clause paragraph.
function getPressureContent(
  tasteCheckCompleted: boolean,
  tastePath: "niche" | "common" | null,
  username: string
): { ctaHeadline: React.ReactNode; consequence: string } | null {
  // taste_check_completed never enters into the backend's cleanup cron —
  // it only checks conversion_count against invite_expires_at, which is
  // stamped at signup for everyone. So someone who hasn't done the taste
  // check yet is exactly as much on the clock as anyone else, and should
  // see that immediately instead of only after finishing the form.
  if (!tasteCheckCompleted) {
    return {
      ctaHeadline: (
        <>
          vouch for <Highlight>3</Highlight> people lock in your username 
        </>
      ),
      consequence:
        "Complete all 3 invites before your code expires to enter The First Circle.",
    };
  }
  if (tastePath === "niche") {
    return {
      ctaHeadline: (
        <>
          Invite <Highlight>3</Highlight> people to unlock The First Circle
        </>
      ),
      consequence:
        "Complete the invites before your code expires or you'll be kicked off the waitlist.",
    };
  }
  if (tastePath === "common") {
    return {
      ctaHeadline: (
        <>
          Invite <Highlight>3</Highlight> people or get kicked off the waitlist
        </>
      ),
      consequence: `Complete all 3 invites before your code expires to enter The First Circle.`,
    };
  }
  return null;
}


/* ------------------------------------------------------------------ */
/*  Countdown — ticks down to user.inviteExpiresAt, full stop. No       */
/*  separate "generate a countdown" step: it's just new Date() math on  */
/*  a timestamp that's already on the record. Returns null when there's */
/*  no deadline set, so the caller hides the clock instead of showing   */
/*  a fake one.                                                        */
/* ------------------------------------------------------------------ */
function useCountdown(expiresAt?: string | null) {
  const target = expiresAt ? new Date(expiresAt).getTime() : null;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!target) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [target]);

  if (!target) return null;

  const remainingMs = Math.max(0, target - now);
  const totalSeconds = Math.floor(remainingMs / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");

  return {
    label: `${pad(Math.floor(totalSeconds / 3600))}:${pad(
      Math.floor((totalSeconds % 3600) / 60)
    )}:${pad(totalSeconds % 60)}`,
    expired: remainingMs <= 0,
  };
}

/** Small uppercase label that announces each block before its content —
 *  "Your spot," "Your invite code," "Code expires in," "Your top match" —
 *  so the page has a clear order to read in instead of every line
 *  sitting at the same visual weight. */
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase leading-none tracking-[0.14em] text-white/55">
      {children}
    </p>
  );
}

/** Same three glyphs used as background-images on the taste-check inputs
 *  (see FIELD_ICON_STYLE below), rendered here as real inline SVG so they
 *  can sit inside a flex row next to a label instead of behind a text
 *  field. Falls back to nothing for an unrecognized field rather than a
 *  broken/blank box. */
const FIELD_ICON_PATHS: Record<"album" | "film" | "book", React.ReactNode> = {
  album: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="2.25" />
    </>
  ),
  film: (
    <>
      <rect x="3" y="7.5" width="18" height="12.5" rx="2" />
      <path d="M3 7.5l2.7-3.5h2.6L5.6 7.5M9.9 7.5l2.7-3.5h2.6L12.5 7.5M16.1 7.5l2.7-3.5h2.6L18.7 7.5" />
    </>
  ),
  book: (
    <>
      <path d="M4 5.5A2 2 0 0 1 6 3.5h6v17H6a2 2 0 0 1-2-2v-13Z" />
      <path d="M20 5.5A2 2 0 0 0 18 3.5h-6v17h6a2 2 0 0 0 2-2v-13Z" />
    </>
  ),
};

function FieldIcon({ field }: { field: string }) {
  const path = FIELD_ICON_PATHS[field as "album" | "film" | "book"];
  if (!path) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[15px] w-[15px] shrink-0"
    >
      {path}
    </svg>
  );
}

// What actually lands on the clipboard: the code alone isn't enough
// context for whoever receives it, so tapping the chip copies a
// ready-to-send referral message (code + link included) instead of
// just the bare string.
function buildInviteMessage(code: string) {
  return `Join the waitlist with my code so I can get early access. I think the invite expires in 24 hours though:\nCode: ${code}\nhttps://joinstratum.app`;
}

/** A plain display of the invite code, not a call-to-action — a
 *  bordered chip rather than a filled button. Tapping copies it as a
 *  courtesy; the code is also just plain, selectable text either way.
 *  Dims and stops responding once it's actually expired. */
function InviteCodeChip({
  code,
  expired = false,
  onCopied,
}: {
  code: string;
  expired?: boolean;
  onCopied?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (expired) return;
    try {
      await navigator.clipboard.writeText(buildInviteMessage(code));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
      onCopied?.();
    } catch {
      // Clipboard access can fail silently (older Safari, insecure
      // context, permissions) — the code is still visible either way.
    }
  };

  return (
    <div
      role="button"
      tabIndex={expired ? -1 : 0}
      onClick={handleCopy}
      onKeyDown={(e) => {
        if (!expired && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          handleCopy();
        }
      }}
      aria-disabled={expired}
      aria-label={expired ? "Invite code (expired)" : "Your invite code"}
      className={`inline-flex items-center gap-2.5 rounded-lg border px-4 py-3 transition-colors sm:py-2.5 ${
        expired
          ? "cursor-default border-white/10 bg-white/[0.02]"
          : "cursor-pointer border-white/15 bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.07]"
      }`}
    >
      <span
        className={`font-mono text-[14px] tracking-[0.14em] ${
          expired ? "text-white/45 line-through" : "text-white/90"
        }`}
      >
        {code}
      </span>
      <span className="text-[10px] font-medium uppercase tracking-wide text-white/50">
        {expired ? "Expired" : copied ? "Copied" : "Copy"}
      </span>
    </div>
  );
}

const MAX_INVITES = 3;

/** Three small dots tracking progress toward the First Circle — one per
 *  invite. Each fills in solid green with a check the moment that
 *  invite converts; unfilled ones stay a plain outlined ring so
 *  progress reads at a glance without needing to parse the count text
 *  underneath. Once all three are in, the caption swaps from a running
 *  count to a one-line confirmation instead of just sitting on "3 of 3"
 *  and letting the moment pass unmarked. */
function ConversionProgress({ count }: { count: number }) {
  const completed = Math.min(Math.max(count, 0), MAX_INVITES);
  const allDone = completed >= MAX_INVITES;

  return (
    <div className="mt-4 flex flex-col items-center gap-2 sm:mt-5 sm:gap-2.5">
      <div className="flex items-center gap-2.5 sm:gap-3">
        {Array.from({ length: MAX_INVITES }).map((_, i) => {
          const filled = i < completed;
          return (
            <span
              key={i}
              role="img"
              aria-label={filled ? `Invite ${i + 1} converted` : `Invite ${i + 1} not yet converted`}
              className={`flex h-6 w-6 items-center justify-center rounded-full border transition-colors sm:h-7 sm:w-7 ${
                filled
                  ? "border-emerald-400/40 bg-emerald-400"
                  : "border-white/20 bg-white/[0.03]"
              }`}
            >
              {filled && (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="black"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3 w-3 sm:h-3.5 sm:w-3.5"
                >
                  <path d="M5 13l4 4L19 7" />
                </svg>
              )}
            </span>
          );
        })}
      </div>
      <p
        className={`text-[12px] font-medium sm:text-[12.5px] ${
          allDone ? "text-emerald-400/90" : "text-white/50"
        }`}
      >
        {allDone
          ? "The First Circle is full, you were too late."
          : `${completed} of ${MAX_INVITES} invites converted`}
      </p>
    </div>
  );
}

// A timer reads as urgent when it looks like a timer — a label above,
// large tabular digits below — not when it's bold text sitting inside a
// sentence. The red label is the one color accent on an otherwise
// monochrome page, used only here because urgency is the one place a
// color signal earns its keep.
function CountdownClock({
  countdown,
}: {
  countdown: { label: string; expired: boolean } | null;
}) {
  if (!countdown) return null;

  return (
    <div className="mt-5 flex flex-col items-center gap-1.5">
      <span
        className={`text-[11px] font-bold uppercase tracking-[0.18em] ${
          countdown.expired ? "text-white/45" : "text-red-400/90"
        }`}
      >
        {countdown.expired ? "Time's up" : "code expires in"}
      </span>
      <span
        className={`font-mono text-[36px] font-bold leading-none tabular-nums sm:text-[52px] ${
          countdown.expired ? "text-white/40" : "text-white"
        }`}
      >
        {countdown.label}
      </span>
    </div>
  );
}

// Fixed to the bottom of the viewport rather than anchored near the chip,
// so it reads as one global confirmation instead of something tucked
// inside the referral card. Purely presentational — visibility and
// timing live in the parent, this just animates in/out off that flag.
function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div
      aria-live="polite"
      className={`pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-6 transition-all duration-300 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      <div className="rounded-full border border-white/15 bg-white/10 px-5 py-2.5 text-[13px] font-medium text-white shadow-lg shadow-black/40 backdrop-blur-md">
        {message}
      </div>
    </div>
  );
}

type TasteMatchLocation = NonNullable<MatchesUser["tasteMatches"]>[number];

// TasteAutocomplete only exposes inputClassName/inputStyle on the <input>
// itself — no child slot to drop an icon element into — so each field's
// icon is a small inline SVG applied as a background-image via inputStyle.
// A Tailwind arbitrary background-image utility class won't work here
// since the data URI is built at runtime (the JIT scanner can't see a
// literal class string to compile), so a plain style object is the
// reliable path.
function iconUrl(svg: string) {
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

const FIELD_ICON_STYLE: Record<
  "album" | "film" | "book",
  React.CSSProperties
> = {
  album: {
    backgroundImage: iconUrl(
      "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.4)' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='8.5'/><circle cx='12' cy='12' r='2.25'/></svg>"
    ),
  },
  film: {
    backgroundImage: iconUrl(
      "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.4)' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'><rect x='3' y='7.5' width='18' height='12.5' rx='2'/><path d='M3 7.5l2.7-3.5h2.6L5.6 7.5M9.9 7.5l2.7-3.5h2.6L12.5 7.5M16.1 7.5l2.7-3.5h2.6L18.7 7.5'/></svg>"
    ),
  },
  book: {
    backgroundImage: iconUrl(
      "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.4)' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'><path d='M4 5.5A2 2 0 0 1 6 3.5h6v17H6a2 2 0 0 1-2-2v-13Z'/><path d='M20 5.5A2 2 0 0 0 18 3.5h-6v17h6a2 2 0 0 0 2-2v-13Z'/></svg>"
    ),
  },
};

const FIELD_ICON_BASE_STYLE: React.CSSProperties = {
  backgroundRepeat: "no-repeat",
  backgroundPosition: "18px center",
  backgroundSize: "18px 18px",
};

/** Shown only when the user never completed the taste check (skipped it
 *  at signup, or arrived here some other way). Lets them submit picks
 *  exactly once, reusing the same autocomplete used on the hero, and
 *  hands the resulting matches back to the parent so the page updates
 *  immediately without a reload. */
function TasteCheckForm({
  username,
  onComplete,
}: {
  username: string;
  onComplete: (matches: TasteMatchLocation[]) => void;
}) {
  const [album, setAlbum] = useState("");
  const [film, setFilm] = useState("");
  const [book, setBook] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Same "actually on the API" gate as the hero form — each
  // TasteAutocomplete reports whether its current text was picked from,
  // or matched exactly against, the suggestions it fetched.
  const [fieldValidity, setFieldValidity] = useState<{
    album: boolean;
    film: boolean;
    book: boolean;
  }>({ album: false, film: false, book: false });

  const setFieldValid = (field: "album" | "film" | "book", valid: boolean) => {
    setFieldValidity((prev) => (prev[field] === valid ? prev : { ...prev, [field]: valid }));
  };

  // Forces every field's inline error to show on a blocked submit
  // attempt, not just the ones already blurred.
  const [showValidationErrors, setShowValidationErrors] = useState(false);

  const allFieldsFilled = album.trim() !== "" && film.trim() !== "" && book.trim() !== "";
  const allFieldsValid = fieldValidity.album && fieldValidity.film && fieldValidity.book;
  const canSubmit = allFieldsFilled && allFieldsValid && !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      if (allFieldsFilled && !allFieldsValid) setShowValidationErrors(true);
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/waitlist/user/${encodeURIComponent(username)}/taste-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickAlbum: album.trim(),
          pickFilm: film.trim(),
          pickBook: book.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "That didn't go through. Try again.");
        return;
      }
      onComplete(data.tasteMatches || []);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Left-aligned now instead of centered: centered placeholder text in a
  // wide, tall, bordered box was reading as a disabled button rather than
  // a field to type into. Left alignment + a leading icon (via inputStyle
  // below) gives it the shape people actually recognize as "type here."
  const inputClassName =
    "w-full rounded-xl border border-white/10 bg-white/[0.04] py-3.5 pl-12 pr-5 text-left text-[14px] font-medium text-white placeholder:text-white/55 transition-colors hover:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/25 focus:border-white/20";

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-2xl flex-col items-center gap-3">
      <TasteAutocomplete
        field="album"
        name="album"
        value={album}
        onChange={setAlbum}
        placeholder="An album only you seem to love"
        inputClassName={inputClassName}
        inputStyle={{ ...FIELD_ICON_BASE_STYLE, ...FIELD_ICON_STYLE.album }}
        wrapperClassName="relative w-full"
        onValidityChange={(valid) => setFieldValid("album", valid)}
        showValidationErrors={showValidationErrors}
      />
      <TasteAutocomplete
        field="film"
        name="film"
        value={film}
        onChange={setFilm}
        placeholder="A film you'd give a 10"
        inputClassName={inputClassName}
        inputStyle={{ ...FIELD_ICON_BASE_STYLE, ...FIELD_ICON_STYLE.film }}
        wrapperClassName="relative w-full"
        onValidityChange={(valid) => setFieldValid("film", valid)}
        showValidationErrors={showValidationErrors}
      />
      <TasteAutocomplete
        field="book"
        name="book"
        value={book}
        onChange={setBook}
        placeholder="A book that changed how you think"
        inputClassName={inputClassName}
        inputStyle={{ ...FIELD_ICON_BASE_STYLE, ...FIELD_ICON_STYLE.book }}
        wrapperClassName="relative w-full"
        onValidityChange={(valid) => setFieldValid("book", valid)}
        showValidationErrors={showValidationErrors}
      />

      {error && <p className="text-[13px] font-medium text-red-400">{error}</p>}

      {!canSubmit && !isSubmitting && allFieldsFilled && !allFieldsValid && (
        <p className="text-[13px] font-medium text-white/40">
          Pick a suggestion from the list for each field to continue
        </p>
      )}

      {/* Full width now, matching the inputs above it, instead of capping
          at max-w-xs — that made the CTA look narrower than the fields
          feeding it, an odd taper once the inputs became this wide. */}
      <button
        type="submit"
        disabled={!canSubmit}
        className={`mt-2 h-[50px] w-full rounded-full text-[15px] font-semibold transition-all ${
          canSubmit
            ? "bg-white text-black hover:bg-white/90"
            : "bg-white/15 text-white/40 cursor-not-allowed"
        }`}
      >
        {isSubmitting ? "Checking…" : "Find my matches"}
      </button>
    </form>
  );
}

export default function MatchesView({ user }: { user: MatchesUser }) {
  // Local state, seeded from props: lets a freshly-completed taste
  // check update the headline/matches immediately without a page
  // reload, rather than needing the server to re-render everything.
  const [tasteMatches, setTasteMatches] = useState<TasteMatchLocation[]>(user.tasteMatches ?? []);
  const [tasteCheckCompleted, setTasteCheckCompleted] = useState(user.tasteCheckCompleted);

  const totalMatches = tasteMatches.reduce((sum, m) => sum + (m.matchCount || 0), 0);

  const matchHeadline =
    totalMatches === 0
      ? "Nobody shares your taste yet"
      : `${new Intl.NumberFormat("en-US").format(totalMatches)} people think like you`;

  // Anchors the subtext on one real, named match if we have one.
  // Letterboxd is currently the only source that reliably returns
  // usernames (see the scraper notes), otherwise falls back to a
  // plain, honest count rather than inventing a name. A taste check
  // that was never completed gets its own distinct message: "haven't
  // matched anyone yet" reads very differently depending on whether
  // picks were ever submitted at all.
  const namedMatch = tasteMatches.find((m) => m.sampleUsernames.length > 0);


  const matchSubtext = !tasteCheckCompleted
    ? "Your picks haven't matched anyone yet. Complete the taste check to find out how many people share your taste."
    : namedMatch
      ? `${namedMatch.sampleUsernames[0]} on ${SOURCE_LABEL[namedMatch.source]} rated "${namedMatch.title}" the same way you did.`
      : totalMatches > 3000
        ? " "
        : "Wow, such empty. Your picks are very unique.";

  const inFirstCircle = user.isFirstCircle;
  const formattedPosition = new Intl.NumberFormat("en-US").format(user.waitlistPosition);
  const inviteCountdown = useCountdown(user.inviteExpiresAt);

  const tastePath = getTastePath(tasteMatches);
  const pressureContent = getPressureContent(tasteCheckCompleted, tastePath, user.username);

  // Toast lives up here (not inside InviteCodeChip) since it's fixed to
  // the viewport, not the chip — one shared instance per page rather
  // than one per chip. Re-copying resets the timer instead of stacking
  // dismiss calls, so a fast double-tap doesn't cut the toast short.
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimeoutRef = useRef<number | null>(null);

  const handleCodeCopied = () => {
    setToastVisible(true);
    if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = window.setTimeout(() => setToastVisible(false), 2200);
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  // Status flows straight into the ask — the subtext under the spot
  // number bridges to "invite 3 friends," and the referral card matches
  // the form's max-w-2xl (wider than before) with bigger type throughout,
  // so it actually competes with the hero stat above. Referrals are the
  // page's real goal; the card earns the weight.
  //
  // Pulled into a variable (rather than inlined once in the JSX below)
  // so it can render in two different places depending on
  // tasteCheckCompleted — see the render section for why.
  const queueAndPressureSection = (
    <div className="flex w-full max-w-2xl flex-col items-center gap-6 text-center">
      <div>
        <FieldLabel>Your queue position</FieldLabel>
        <p className="mt-1.5 text-[30px] font-bold leading-tight tracking-[-0.02em] text-white sm:text-[34px]">
          {inFirstCircle ? "You're in the First Circle" : `#${formattedPosition}`}
        </p>
        <p className="mt-1.5 text-[14px] font-medium text-white/60 sm:text-[15px]">
          {inFirstCircle
            ? "VIP access is yours. Welcome in."
            : pressureContent
              ? "The First Circle members get ultra early access to Stratum."
              : "in line for Stratum — join the First Circle to skip it and unlock VIP access."}
        </p>
      </div>

      {!inFirstCircle && pressureContent && (
        <div className="mt-3 w-full rounded-3xl border border-white/15 bg-white/[0.04] p-5 sm:p-8">
          <p className="text-[18px] font-bold leading-snug text-white sm:text-[21px]">
            {pressureContent.ctaHeadline}
          </p>

          <ConversionProgress count={user.conversionCount ?? 0} />

          <CountdownClock countdown={inviteCountdown} />

          <p className="mt-5 text-[13.5px] leading-relaxed text-white/65">
            {pressureContent.consequence}
          </p>

          <div className="mt-6 flex flex-col items-center gap-1.5">
            <FieldLabel>Your invite code</FieldLabel>
            <InviteCodeChip
              code={user.inviteCode}
              expired={inviteCountdown?.expired ?? false}
              onCopied={handleCodeCopied}
            />
          </div>
        </div>
      )}
    </div>
  );

  return (
    <main className={`${poppins.className} min-h-screen bg-black`}>
      <Navbar backgroundTheme="dark" />

      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-14 px-6 pb-24 pt-24 sm:pt-28 lg:gap-16 lg:pt-32">
        {/* Hero: the headline is the one thing on the page meant to be
            read first, so it's the largest text here by a wide margin. */}
        <div className="flex flex-col items-center gap-4 text-center">
          <h1 className="text-[28px] font-semibold leading-[1.15] tracking-[-0.03em] text-white sm:text-[36px] lg:text-[44px]">
            {matchHeadline}
          </h1>
          <p className="max-w-xl text-[15px] font-medium leading-relaxed text-white/70 sm:text-[17px]">
            {matchSubtext}
          </p>
        </div>

        {/* Taste check, one-time only: shown first while incomplete, ahead
            of the pressure card below it. Leads with the low-stakes ask
            (pick your favorites) before the countdown/invite-code stakes,
            so someone brand new isn't hit with "invite 3 or get kicked off"
            before they've done anything else on the page. Replaced by
            whatever it produced (a real match breakdown, or the plain
            zero-match state) once completed. */}
        {!tasteCheckCompleted && (
          <TasteCheckForm
            username={user.username}
            onComplete={(matches) => {
              setTasteMatches(matches);
              setTasteCheckCompleted(true);
            }}
          />
        )}

        {/* Urgency card, shown below the form while the taste check is
            still incomplete: the invite_expires_at deadline (and the
            "kicked off the waitlist" consequence behind it) starts at
            signup regardless of taste-check status, so it's still shown
            immediately rather than only after completion — just under
            the form instead of above it. */}
        {!tasteCheckCompleted && queueAndPressureSection}

        {/* Match card — the three picks sit side by side as columns instead
            of stacked rows, so the album/film/book breakdown reads as one
            wide comparison at a glance rather than a list to scroll
            through. Widened to max-w-2xl to match the referral card below
            it and give three columns real room; folds back to a stacked,
            divided list below the sm breakpoint where three columns would
            otherwise crush titles down to a few characters each. */}
        {tasteMatches.length > 0 && (
          <div className="flex w-full flex-col items-center gap-4">
            <FieldLabel>Your matches</FieldLabel>
            <div className="grid w-full max-w-2xl grid-cols-1 divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.02] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {tasteMatches.map((location) => (
                <div
                  key={location.field}
                  className="flex flex-col gap-2.5 px-5 py-4 text-left sm:px-6 sm:py-5"
                >
                  <div className="flex items-center gap-1.5 text-white/55">
                    <FieldIcon field={location.field} />
                    <FieldLabel>{location.field}</FieldLabel>
                  </div>
                  <p className="text-[15px] font-bold leading-snug text-white line-clamp-2">
                    {location.title}
                  </p>
                  <p className="text-[13px] leading-relaxed text-white/55 line-clamp-3 sm:min-h-[3.9em]">
                    {location.sampleUsernames.length > 0
                      ? `${location.sampleUsernames[0]} on ${SOURCE_LABEL[location.source]} rated this the same way you did.`
                      : location.matchCount > 0
                        ? `${new Intl.NumberFormat("en-US").format(location.matchCount)} people rated this the same way.`
                        : "Nobody else has rated this yet."}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Same card as above, rendered here instead once the taste check
            is done — the "before the form" copy is now moot, and this
            keeps the original flow of hero -> matches -> queue/pressure
            for anyone who's already completed it. */}
        {tasteCheckCompleted && queueAndPressureSection}
      </div>

      <Toast message="Code copied, ready to pasta." visible={toastVisible} />
    </main>
  );
}