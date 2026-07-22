"use client";

import { SOURCE_LABEL, type TasteMatchLocation } from "./taste-types";

function formatCount(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

function MatchLine({ location }: { location: TasteMatchLocation }) {
  const { matchCount, sampleUsernames, source } = location;
  const sourceLabel = SOURCE_LABEL[source];

  if (matchCount <= 0) {
    return (
      <p className="text-[13px] leading-[1.5] text-white/40">
        Nobody else has rated this yet.
      </p>
    );
  }

  // We know exactly who they are (small count, or a source like
  // Letterboxd where we could pull real usernames) — name them.
  if (sampleUsernames.length > 0 && matchCount <= sampleUsernames.length) {
    const names = sampleUsernames.slice(0, matchCount);
    const listText =
      names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
    return (
      <p className="text-[13px] leading-[1.5] text-white/55">
        <span className="font-semibold text-white/80">{listText}</span> on {sourceLabel} also rated this 5
        stars.
      </p>
    );
  }

  // Large count but we have at least one real name to anchor it —
  // "johndoe on Letterboxd and 2,999 others rated this 5 stars."
  if (sampleUsernames.length > 0) {
    const [first] = sampleUsernames;
    const remaining = matchCount - 1;
    return (
      <p className="text-[13px] leading-[1.5] text-white/55">
        <span className="font-semibold text-white/80">{first}</span> on {sourceLabel} and{" "}
        <span className="font-semibold text-white/80">
          {formatCount(remaining)} {remaining === 1 ? "other" : "others"}
        </span>{" "}
        rated this 5 stars.
      </p>
    );
  }

  // No usernames available at all (e.g. RateYourMusic without a proxy)
  // — fall back to a plain count.
  return (
    <p className="text-[13px] leading-[1.5] text-white/55">
      <span className="font-semibold text-white/80">{formatCount(matchCount)}</span>{" "}
      {matchCount === 1 ? "person" : "people"} on {sourceLabel} rated this 5 stars.
    </p>
  );
}

export default function TasteMatchBadge({ location }: { location: TasteMatchLocation }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-left">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/35">{location.field}</p>
      <p className="mt-1 text-[15px] font-semibold text-white">{location.title}</p>
      <div className="mt-2">
        <MatchLine location={location} />
      </div>
    </div>
  );
}