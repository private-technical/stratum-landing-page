"use client";

import { useEffect, useRef, useState } from "react";

interface InviteCodeFieldProps {
  value: string;
  onChange: (value: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Invite code — optional, and deliberately low-key: collapsed by      */
/*  default behind a small text toggle so it never competes with the    */
/*  required fields above it. Expands into a slim, dimmer pill when     */
/*  opted into; the same control collapses it again (clearing the       */
/*  value, since a closed field implies "never mind"), so there's       */
/*  always exactly one obvious way to add or remove it.                 */
/* ------------------------------------------------------------------ */
export function InviteCodeField({ value, onChange }: InviteCodeFieldProps) {
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasOpened = useRef(false);

  useEffect(() => {
    if (!expanded) return;
    if (!hasOpened.current) {
      hasOpened.current = true;
      return;
    }
    inputRef.current?.focus();
  }, [expanded]);

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        aria-expanded={false}
        className="flex items-center gap-1.5 text-[12.5px] font-medium text-white/35 transition-colors hover:text-white/65"
      >
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
        </svg>
        Have an invite code?
      </button>
    );
  }

  return (
    <div className="flex w-full items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Invite code (optional)"
        aria-label="Invite code (optional)"
        className="h-[46px] w-full rounded-full border border-white/10 bg-white/5 px-5 text-center text-[13px] font-medium tracking-[-0.01em] text-white placeholder:text-white/40 transition-colors hover:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/25"
      />
      <button
        type="button"
        onClick={() => {
          onChange("");
          setExpanded(false);
        }}
        aria-label="Remove invite code"
        className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full text-white/30 transition-colors hover:bg-white/10 hover:text-white/70"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
}