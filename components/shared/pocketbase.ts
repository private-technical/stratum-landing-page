"use client";

const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || "https://kvxjstklylu1j2p.ba7w.pocketbasecloud.com";

export interface JoinWaitlistPayload {
  email: string;
  username: string;
  inviteCode?: string;
  pickAlbum?: string;
  pickFilm?: string;
  pickBook?: string;
}

export interface JoinWaitlistResult {
  id: string;
  username: string;
  waitlistPosition: number;
  isFirstCircle: boolean;
  inviteCode: string;
  inviteExpiresAt: string;
  accessToken: string;
}

export class WaitlistJoinError extends Error {
  field: string | null;
  status: number;
  constructor(message: string, field: string | null, status: number) {
    super(message);
    this.field = field;
    this.status = status;
  }
}

// Used only when the server returns a non-2xx status with no specific
// `error` field to explain why (an unhandled exception on the server,
// a proxy timeout, etc.), so the message still reflects what kind of
// failure it was rather than defaulting to one blanket line regardless
// of status code.
function fallbackMessageForStatus(status: number): string {
  if (status === 429) {
    return "Too many attempts. Wait a moment and try again.";
  }
  if (status >= 500) {
    return "Our server hit a snag. Try again in a moment.";
  }
  return "That didn't go through. Try again.";
}

// Lightweight, dependency-free device fingerprint: a hash of a few
// stable browser signals, persisted so the SAME device produces the SAME
// fingerprint across visits (the server's duplicate-signup check relies
// on that stability).
function computeFingerprint(): string {
  const signals = [
    navigator.userAgent,
    navigator.language,
    String(screen.colorDepth),
    `${screen.width}x${screen.height}`,
    String(new Date().getTimezoneOffset()),
    String((navigator as any).hardwareConcurrency || ""),
  ].join("|");

  let hash = 0;
  for (let i = 0; i < signals.length; i++) {
    hash = (hash << 5) - hash + signals.charCodeAt(i);
    hash |= 0;
  }
  return `fp_${Math.abs(hash)}`;
}

export function getDeviceFingerprint(): string {
  const STORAGE_KEY = "stratum_device_id";
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const fresh = computeFingerprint();
    localStorage.setItem(STORAGE_KEY, fresh);
    return fresh;
  } catch {
    // localStorage unavailable (private mode, etc.) — fall back to a
    // non-persisted fingerprint for this single request.
    return computeFingerprint();
  }
}

export async function joinWaitlist(payload: JoinWaitlistPayload): Promise<JoinWaitlistResult> {
  const res = await fetch(`${POCKETBASE_URL}/api/waitlist/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload,
      deviceFingerprint: getDeviceFingerprint(),
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new WaitlistJoinError(
      data.error || fallbackMessageForStatus(res.status),
      data.field || null,
      res.status
    );
  }

  return data as JoinWaitlistResult;
}

// Fire-and-forget prefetch — called (debounced) as the user types into
// the album/film/book fields, well before they've submitted anything.
// Hits OUR Next.js API route (relative path, not POCKETBASE_URL), which
// checks/populates PocketBase's taste_matches_cache in the background.
// The caller never awaits the result; it's just a warm-up so the join
// handler's cache lookup is a hit by the time they submit.
export async function triggerTasteScrape(
  field: "album" | "film" | "book",
  title: string
): Promise<void> {
  try {
    await fetch("/api/taste/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field, title }),
      keepalive: true,
    });
  } catch {
    // Best-effort — if this fails, the join handler's own fallback
    // scrapes synchronously at submit time instead.
  }
}