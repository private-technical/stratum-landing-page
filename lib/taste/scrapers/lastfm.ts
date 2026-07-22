import type { ScrapeResult } from "../types";

// Free, instant signup at last.fm/api/account/create.
const LASTFM_API_KEY = process.env.LASTFM_API_KEY;
const LASTFM_BASE = "https://ws.audioscrobbler.com/2.0/";

interface LastfmAlbumMatch {
  name: string;
  artist: string;
  url: string;
}

function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Picks selected from the suggestion dropdown are stored as
// "Album by Artist" so the exact release is known, not just guessed at
// from a bare album name (the "which Midnights" problem). Free-typed
// values without a selection just won't match this pattern and fall
// through to a fuzzy search, same limitation as before.
function parseDisambiguated(input: string): { album: string; artist: string | null } {
  const match = input.match(/^(.*)\sby\s(.+)$/i);
  if (!match) return { album: input, artist: null };
  return { album: match[1].trim(), artist: match[2].trim() };
}

async function searchAlbums(title: string): Promise<LastfmAlbumMatch[]> {
  if (!LASTFM_API_KEY) {
    console.warn("[lastfm] LASTFM_API_KEY is not set, skipping album lookup.");
    return [];
  }
  try {
    const params = new URLSearchParams({
      method: "album.search",
      album: title,
      api_key: LASTFM_API_KEY,
      format: "json",
      limit: "10",
    });
    const res = await fetch(`${LASTFM_BASE}?${params.toString()}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.warn(`[lastfm] ${res.status} searching for "${title}"`);
      return [];
    }
    const data = await res.json();
    const matches = data?.results?.albummatches?.album || [];
    return (Array.isArray(matches) ? matches : [matches]) as LastfmAlbumMatch[];
  } catch (err) {
    console.warn(`[lastfm] search failed for "${title}"`, err);
    return [];
  }
}

async function getListenerCount(artist: string, album: string): Promise<number | null> {
  if (!LASTFM_API_KEY) return null;
  try {
    const params = new URLSearchParams({
      method: "album.getinfo",
      artist,
      album,
      api_key: LASTFM_API_KEY,
      format: "json",
    });
    const res = await fetch(`${LASTFM_BASE}?${params.toString()}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.warn(`[lastfm] ${res.status} fetching info for "${album}" by "${artist}"`);
      return null;
    }
    const data = await res.json();
    const listeners = data?.album?.listeners;
    return listeners ? parseInt(listeners, 10) : null;
  } catch (err) {
    console.warn(`[lastfm] getinfo failed for "${album}" by "${artist}"`, err);
    return null;
  }
}

// Only used when there's no artist to go on (a free-typed, unselected
// pick). Prefers an exact normalized title match among the search
// results; otherwise takes the top search result, a real guess when
// several artists share an album name, exactly the "Midnights" case.
function pickBestMatch(title: string, results: LastfmAlbumMatch[]): LastfmAlbumMatch | null {
  if (results.length === 0) return null;
  const target = normalizeForMatch(title);
  const exact = results.find((r) => normalizeForMatch(r.name) === target);
  return exact || results[0];
}

export async function scrape(input: string): Promise<ScrapeResult | null> {
  const { album, artist } = parseDisambiguated(input);

  // Known artist (picked from the dropdown): skip the ambiguous search
  // step entirely and go straight to the exact release. This is the
  // actual fix for same-named albums by different artists, search alone
  // never had enough signal to tell them apart.
  if (artist) {
    const listeners = await getListenerCount(artist, album);
    if (!listeners) return null;
    return {
      matchCount: listeners,
      matchedTitle: `${album} by ${artist}`,
      sourceUrl: `https://www.last.fm/music/${encodeURIComponent(artist)}/${encodeURIComponent(album)}`,
    };
  }

  const results = await searchAlbums(album);
  const match = pickBestMatch(album, results);
  if (!match) return null;

  const listeners = await getListenerCount(match.artist, match.name);
  if (!listeners) return null;

  return {
    matchCount: listeners,
    matchedTitle: `${match.name} by ${match.artist}`,
    sourceUrl: match.url,
  };
}

// Used by /api/taste/suggest for the dropdown. Deliberately lighter
// than scrape(): no listener lookup, just enough to disambiguate
// visually (this is exactly where the artist name matters).
export async function suggest(query: string): Promise<{ label: string; value: string }[]> {
  const results = await searchAlbums(query);
  return results.slice(0, 6).map((r) => {
    const value = `${r.name} by ${r.artist}`;
    return { label: value, value };
  });
}