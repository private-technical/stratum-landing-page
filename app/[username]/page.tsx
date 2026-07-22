import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import {
  getWaitlistUserByUsername,
  verifyAccessToken,
  SESSION_COOKIE_NAME,
} from "../../components/shared/pocketbase-server";
import MatchesView from "./matches-view";
import PrivateGate from "./private-gate";

export default async function Page({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  // Local dev bypass: skips PocketBase entirely (both the existence check
  // and the access-token check) so the page renders even with no backend
  // running locally. Requires BOTH an explicit opt-in env var and a
  // non-production NODE_ENV, so a misconfigured deploy can't accidentally
  // ship this open. Set BYPASS_WAITLIST_AUTH=true in your local .env only.
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.BYPASS_WAITLIST_AUTH === "true"
  ) {
    return (
      <MatchesView
        user={{
          username,
          waitlistPosition: 1002,
          isFirstCircle: false,
          tasteCheckCompleted: true,
          // inviteCode / inviteExpiresAt: real users get these from
          // verifyAccessToken now (see pocketbase-server.ts), these are
          // just fixture values for the bypass path.
          inviteCode: "STRATUM-7F3K9Q",
          inviteExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          // 1 of 3 converted so far — set to 0 to preview the empty
          // state, or 3 to preview the "all done" confirmation state.
          conversionCount: 1,
          // Covers the three real display states: a large count anchored
          // by a real username (film), zero matches (book), and a large
          // count with no usernames available (album — RateYourMusic
          // doesn't reliably return them, see the scraper notes).
          // As-is, only goodreads is under its cutoff, so this lands on
          // the "common" pressure copy — drop film under 5,000 and/or
          // album under 2,000 to preview the "niche" copy instead.
          tasteMatches: [
            {
              field: "film",
              title: "Parasite",
              source: "letterboxd",
              matchCount: 128473,
              sampleUsernames: ["cinephile23"],
              sourceUrl: "https://letterboxd.com/film/parasite-2019/",
            },
            {
              field: "book",
              title: "Norwegian Wood",
              source: "goodreads",
              matchCount: 0,
              sampleUsernames: [],
              sourceUrl: null,
            },
            {
              field: "album",
              title: "OK Computer",
              source: "rateyourmusic",
              matchCount: 3182,
              sampleUsernames: [],
              sourceUrl: "https://rateyourmusic.com/release/album/radiohead/ok-computer/",
            },
          ],
        }}
      />
    );
  }

  // Nonexistent username entirely -> real 404, same as before.
  const exists = await getWaitlistUserByUsername(username);
  if (!exists) {
    notFound();
  }

  // Username exists, but does THIS visitor's session prove it's theirs?
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const verifiedUser = token ? await verifyAccessToken(username, token) : null;

  if (!verifiedUser) {
    return <PrivateGate username={username} />;
  }

  return <MatchesView user={verifiedUser} />;
}