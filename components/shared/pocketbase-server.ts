import type { TasteMatchLocation } from "./taste-types";

const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || "http://127.0.0.1:8090";

// Shared between the two Route Handlers that set this cookie
// (set-session, access) and page.tsx, which reads it.
export const SESSION_COOKIE_NAME = "stratum_access";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export interface WaitlistUserPublicInfo {
  username: string;
  waitlistPosition: number;
  isFirstCircle: boolean;
  tasteCheckCompleted: boolean;
}

// Superset returned only from verifyAccessToken. tasteMatches reveals
// what the person picked, so it's deliberately NOT part of the plain
// public lookup below (that route is unauthenticated; anyone can hit it
// with any username to check existence). inviteCode/inviteExpiresAt are
// private for the same reason.
export interface WaitlistUserWithMatches extends WaitlistUserPublicInfo {
  tasteMatches: TasteMatchLocation[];
  inviteCode: string;
  inviteExpiresAt: string | null;
  // How many of the 3 invites tied to inviteCode have converted so far
  // (see conversion_count on waitlist_users). Same privacy rationale as
  // inviteCode/inviteExpiresAt above — only exposed on the authenticated
  // read, not the public existence-check route.
  conversionCount: number;
}

/**
 * Looks up a waitlist user by username for the /[username] page. Returns
 * null if no such user exists — the page should call notFound() in that
 * case rather than rendering anything.
 *
 * Deliberately NOT re-exported from shared/pocketbase.ts: that file is
 * "use client" and runs in the browser, but this needs to run on the
 * server (inside the page's Server Component) so the 404 happens before
 * any HTML reaches the client — a client-side check would still let
 * anyone briefly see (or scrape) the page for an arbitrary username.
 */
export async function getWaitlistUserByUsername(
  username: string
): Promise<WaitlistUserPublicInfo | null> {
  const res = await fetch(
    `${POCKETBASE_URL}/api/waitlist/user/${encodeURIComponent(username)}`,
    // This gates page access, so a stale cached "not found" (or "found")
    // would be a real bug, not just a stale display number — always hit
    // PocketBase fresh.
    { cache: "no-store" }
  );

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Waitlist user lookup failed with status ${res.status}`);
  }
  return (await res.json()) as WaitlistUserPublicInfo;
}

/**
 * Checks whether `token` is the real access token for `username`. This is
 * the entire access-control decision for /[username] — everything else
 * (the cookie, the emailed link) exists just to get a valid token in
 * front of the right person. Also returns the saved taste matches (see
 * WaitlistUserWithMatches) since this is the one authenticated place
 * they're allowed to be read back.
 */
export async function verifyAccessToken(
  username: string,
  token: string
): Promise<WaitlistUserWithMatches | null> {
  const res = await fetch(
    `${POCKETBASE_URL}/api/waitlist/user/${encodeURIComponent(username)}/verify-access?token=${encodeURIComponent(token)}`,
    { cache: "no-store" }
  );

  if (res.status === 401 || res.status === 400) return null;
  if (!res.ok) {
    throw new Error(`Access verification failed with status ${res.status}`);
  }
  return (await res.json()) as WaitlistUserWithMatches;
}

export interface TasteCheckPayload {
  pickAlbum: string;
  pickFilm: string;
  pickBook: string;
}

// Thrown with whatever status/message PocketBase's own taste-check route
// returned (400 for missing picks, 401 for a bad/expired token, 409 if
// it was already completed), so the Route Handler calling this can pass
// the real reason straight through instead of flattening every failure
// into one generic message.
export class TasteCheckError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Submits picks for a user who skipped the taste check at signup.
 * Mirrors verifyAccessToken exactly: PocketBase checks the token against
 * this username's access_token itself, this is just a thin relay, not a
 * second, separate auth decision made here.
 */
export async function submitTasteCheck(
  username: string,
  token: string,
  payload: TasteCheckPayload
): Promise<TasteMatchLocation[]> {
  const res = await fetch(
    `${POCKETBASE_URL}/api/waitlist/user/${encodeURIComponent(username)}/taste-check?token=${encodeURIComponent(token)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    }
  );

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new TasteCheckError(data.error || "Something went wrong. Try again.", res.status);
  }

  return (data.tasteMatches || []) as TasteMatchLocation[];
}