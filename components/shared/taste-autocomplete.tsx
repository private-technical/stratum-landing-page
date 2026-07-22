"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface Suggestion {
  label: string;
  value: string;
}

interface TasteAutocompleteProps {
  field: "album" | "film" | "book";
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  inputClassName: string;
  inputStyle?: React.CSSProperties;
  wrapperClassName?: string;
  wrapperStyle?: React.CSSProperties;
  inputRef?: (el: HTMLInputElement | null) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  required?: boolean;
  ariaRequired?: boolean;
  tabIndex?: number;
  ariaHidden?: boolean;
  // Fires whenever this field's "is this actually on the API" status
  // changes, so the parent form can gate its submit button without
  // re-implementing the suggestion-matching logic itself.
  onValidityChange?: (isValid: boolean) => void;
  // Parent sets this true after a blocked submit attempt, so the error
  // shows immediately on every unconfirmed field — not just the ones
  // the user happened to already blur.
  showValidationErrors?: boolean;
}

// Snappier than the existing 700ms taste-prefetch debounce: this is just
// a read-only search, cheap enough to fire often.
const SUGGEST_DEBOUNCE_MS = 150;

// Shared across every instance on the page, so retyping something
// already searched this session (a very common typo-then-fix pattern)
// resolves instantly instead of waiting on the network again.
const suggestionCache = new Map<string, Suggestion[]>();

// Suggestion values come back as "Title (YYYY)" or "Title by X". This is
// purely cosmetic: splits that into a bold main part and a muted
// suffix for readability. The full value is still what gets stored on
// selection, this only changes how it's displayed in the list.
function splitLabel(label: string): { main: string; suffix: string | null } {
  const byMatch = label.match(/^(.*)\s(by\s.+)$/i);
  if (byMatch) return { main: byMatch[1].trim(), suffix: byMatch[2].trim() };
  const yearMatch = label.match(/^(.*)\s(\(\d{4}\))$/);
  if (yearMatch) return { main: yearMatch[1].trim(), suffix: yearMatch[2].trim() };
  return { main: label, suffix: null };
}

// The only thing that makes a value "real" is that the API actually
// returned it — so this checks the typed text (case/whitespace
// insensitive) against both the value and the display label of every
// suggestion the last successful lookup came back with.
function matchesAnySuggestion(trimmedLower: string, suggestions: Suggestion[]): boolean {
  return suggestions.some(
    (s) =>
      s.value.trim().toLowerCase() === trimmedLower ||
      s.label.trim().toLowerCase() === trimmedLower
  );
}


export function TasteAutocomplete({
  field,
  name,
  value,
  onChange,
  placeholder,
  inputClassName,
  inputStyle,
  wrapperClassName,
  wrapperStyle,
  inputRef,
  onKeyDown,
  required,
  ariaRequired,
  tabIndex,
  ariaHidden,
  onValidityChange,
  showValidationErrors,
}: TasteAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);

  // The last typed value that was actually confirmed against the API —
  // either picked from the dropdown, or typed out in full and matched
  // exactly on lookup. Compared case/whitespace-insensitively against
  // the live value below, so editing away from a confirmed pick (even
  // by one character) drops back to "unverified" on its own, no extra
  // reset logic needed.
  const [verifiedValue, setVerifiedValue] = useState<string | null>(null);
  // Only show the "not found" message once the user has actually left
  // the field, or the parent form forced it after a blocked submit —
  // never mid-keystroke, since a partial word not matching yet is
  // expected, not an error.
  const [blurred, setBlurred] = useState(false);

  const justSelected = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dropdownElRef = useRef<HTMLUListElement | null>(null);
  const inputElRef = useRef<HTMLInputElement | null>(null);

  const setInputRefs = (el: HTMLInputElement | null) => {
    inputElRef.current = el;
    inputRef?.(el);
  };

  useEffect(() => {
    if (justSelected.current) {
      justSelected.current = false;
      return;
    }
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      setIsLoading(false);
      setVerifiedValue(null);
      return;
    }

    const cacheKey = `${field}:${trimmed.toLowerCase()}`;
    const cached = suggestionCache.get(cacheKey);
    if (cached) {
      // Already have this one, no need to wait on the network again.
      setSuggestions(cached);
      setIsOpen(cached.length > 0);
      setHighlighted(-1);
      setVerifiedValue(matchesAnySuggestion(trimmed.toLowerCase(), cached) ? trimmed : null);
      return;
    }

    setIsLoading(true);
    const timeout = setTimeout(() => {
      // Cancel whatever the previous keystroke's request was doing,
      // rather than just ignoring its result, so a fast typer isn't
      // leaving a pile of abandoned requests competing for the
      // browser's limited per-host connections.
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      fetch(`/api/taste/suggest?field=${field}&q=${encodeURIComponent(trimmed)}`, {
        signal: controller.signal,
      })
        .then((res) => res.json())
        .then((data) => {
          const results: Suggestion[] = data.suggestions || [];
          suggestionCache.set(cacheKey, results);
          setSuggestions(results);
          setIsOpen(true);
          setHighlighted(-1);
          setVerifiedValue(matchesAnySuggestion(trimmed.toLowerCase(), results) ? trimmed : null);
        })
        .catch((err) => {
          if (err?.name === "AbortError") return; // superseded, not a real failure
          setSuggestions([]);
          setIsOpen(false);
          setVerifiedValue(null);
        })
        .finally(() => setIsLoading(false));
    }, SUGGEST_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [field, value]);

  // Positions the portal against the input's actual on-screen location,
  // so it doesn't matter how deep this sits in a transformed/animated
  // layout, it always lines up with wherever the input really is.
  useLayoutEffect(() => {
    if (!isOpen || !inputElRef.current) return;
    const r = inputElRef.current.getBoundingClientRect();
    setRect({ top: r.bottom + 8, left: r.left, width: r.width });

    // A scroll or resize would leave a fixed-position dropdown
    // stranded relative to an input that's since moved. Closing is the
    // simplest correct response, rather than tracking every frame.
    const close = () => setIsOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [isOpen]);

  // Outside-click detection has to check both the input's own wrapper
  // and the portal's dropdown element, since the dropdown now lives in
  // a completely separate part of the DOM (under <body>, not here).
  useEffect(() => {
    if (!isOpen) return;
    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node;
      const insideInput = containerRef.current?.contains(target);
      const insideDropdown = dropdownElRef.current?.contains(target);
      if (!insideInput && !insideDropdown) setIsOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  const selectSuggestion = (suggestion: Suggestion) => {
    justSelected.current = true;
    setIsOpen(false);
    setSuggestions([]);
    setHighlighted(-1);
    setVerifiedValue(suggestion.value);
    onChange(suggestion.value);
  };

  const trimmedValue = value.trim();
  const isValid =
    trimmedValue.length > 0 &&
    verifiedValue !== null &&
    verifiedValue.trim().toLowerCase() === trimmedValue.toLowerCase();

  // Notify the parent whenever the confirmed/unconfirmed status flips —
  // deliberately keyed on isValid alone (not onValidityChange), since an
  // inline arrow function from the parent would otherwise re-fire this
  // every render.
  useEffect(() => {
    onValidityChange?.(isValid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isValid]);

  const showError =
    trimmedValue.length >= 2 && !isLoading && !isValid && (blurred || !!showValidationErrors);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isOpen && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlighted((h) => (h + 1) % suggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlighted((h) => (h <= 0 ? suggestions.length - 1 : h - 1));
        return;
      }
      if (e.key === "Enter" && highlighted >= 0) {
        e.preventDefault();
        selectSuggestion(suggestions[highlighted]);
        return;
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        return;
      }
    }
    onKeyDown?.(e);
  };

  const showDropdown = isOpen && (suggestions.length > 0 || isLoading);

  return (
    <div ref={containerRef} className={wrapperClassName || "relative"} style={wrapperStyle}>
      <input
        ref={setInputRefs}
        type="text"
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (suggestions.length > 0) setIsOpen(true);
        }}
        onBlur={() => setBlurred(true)}
        placeholder={placeholder}
        required={required}
        aria-required={ariaRequired}
        tabIndex={tabIndex}
        aria-hidden={ariaHidden}
        role="combobox"
        aria-expanded={showDropdown}
        aria-autocomplete="list"
        aria-invalid={showError}
        autoComplete="off"
        className={inputClassName}
        style={inputStyle}
      />

      {showError && (
        <p className="mt-1.5 text-left text-[12px] font-medium leading-snug text-red-400" role="alert">
          {`We don't recognize "${trimmedValue}" as a listed ${field}. Choose one of the suggestions to continue.`}
        </p>
      )}

      {showDropdown &&
        rect &&
        createPortal(
          <ul
            ref={dropdownElRef}
            role="listbox"
            style={{ position: "fixed", top: rect.top, left: rect.left, width: rect.width }}
            className="z-[9999] max-h-64 overflow-y-auto rounded-2xl border border-white/10 bg-[#161616] py-1.5 text-left shadow-[0_24px_60px_-12px_rgba(0,0,0,0.85)]"
          >
            {isLoading && suggestions.length === 0 && (
              <li className="flex items-center gap-2 px-4 py-3 text-[13px] font-medium text-white/40">
                <span className="h-3 w-3 animate-spin rounded-full border-[1.5px] border-white/25 border-t-white/70" />
                Searching…
              </li>
            )}
            {suggestions.map((s, i) => {
              const { main, suffix } = splitLabel(s.label);
              return (
                <li key={s.value} role="option" aria-selected={i === highlighted}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectSuggestion(s)}
                    onMouseEnter={() => setHighlighted(i)}
                    className={`flex w-full items-baseline gap-1.5 truncate border-b border-white/[0.04] px-4 py-2.5 text-left text-[13px] tracking-[-0.01em] transition-colors last:border-b-0 ${
                      i === highlighted ? "bg-white/10" : ""
                    }`}
                  >
                    <span className="truncate font-semibold text-white">{main}</span>
                    {suffix && (
                      <span className="shrink-0 text-[12px] font-medium text-white/45">
                        {suffix}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>,
          document.body
        )}
    </div>
  );
}