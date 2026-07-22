import type { ScrapeResult } from "../types";

// TMDB's own recommended auth method: the Read Access Token, sent as a
// Bearer token. Find it at themoviedb.org under Settings -> API ->
// "API Read Access Token" (the long token, not the shorter "API Key"
// field above it). Free, instant approval for a personal account.
const TMDB_READ_ACCESS_TOKEN = process.env.TMDB_READ_ACCESS_TOKEN;
const TMDB_BASE = "https://api.themoviedb.org/3";

// Below this average (out of 10), a film is treated as having no
// "people loved this" match at all, regardless of vote count. TMDB has
// no per-star breakdown, so this average-rating floor is the closest
// honest stand-in for "people who rated it highly" the API allows.
const MIN_AVERAGE_RATING = 7.0;

export interface TmdbMovie {
  id: number;
  title: string;
  vote_count: number;
  vote_average: number;
  release_date?: string;
}

function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Picks selected from the suggestion dropdown are stored as
// "Title (YYYY)" so the exact film is known, not just guessed at from a
// bare title. Free-typed values without a selection just won't match
// this pattern and fall through to fuzzy matching, same as before.
function parseDisambiguated(input: string): { title: string; year: string | null } {
  const match = input.match(/^(.*)\s\((\d{4})\)$/);
  if (!match) return { title: input, year: null };
  return { title: match[1].trim(), year: match[2] };
}

async function searchMovies(title: string): Promise<TmdbMovie[]> {
  if (!TMDB_READ_ACCESS_TOKEN) {
    console.warn("[tmdb] TMDB_READ_ACCESS_TOKEN is not set, skipping film lookup.");
    return [];
  }
  try {
    const url = `${TMDB_BASE}/search/movie?query=${encodeURIComponent(title)}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${TMDB_READ_ACCESS_TOKEN}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.warn(`[tmdb] ${res.status} searching for "${title}"`);
      return [];
    }
    const data = await res.json();
    return (data.results || []) as TmdbMovie[];
  } catch (err) {
    console.warn(`[tmdb] search failed for "${title}"`, err);
    return [];
  }
}

// Prefers, in order: an exact title + year match (only possible when the
// pick came from the suggestion dropdown), then an exact title match,
// then the most-voted result as a last resort. Falling back to "most
// voted" is still a guess for a free-typed, unselected pick, same
// limitation as before, just no longer the only option.
function pickBestMatch(input: string, results: TmdbMovie[]): TmdbMovie | null {
  if (results.length === 0) return null;
  const { title, year } = parseDisambiguated(input);
  const target = normalizeForMatch(title);

  if (year) {
    const exactWithYear = results.find(
      (r) => normalizeForMatch(r.title) === target && r.release_date?.startsWith(year)
    );
    if (exactWithYear) return exactWithYear;
  }
  const exact = results.find((r) => normalizeForMatch(r.title) === target);
  if (exact) return exact;
  return [...results].sort((a, b) => b.vote_count - a.vote_count)[0];
}

export async function scrape(title: string): Promise<ScrapeResult | null> {
  const results = await searchMovies(parseDisambiguated(title).title);
  const match = pickBestMatch(title, results);
  if (!match || !match.vote_count) return null;
  if (match.vote_average < MIN_AVERAGE_RATING) return null;

  return {
    matchCount: match.vote_count,
    matchedTitle: match.title,
    sourceUrl: `https://www.themoviedb.org/movie/${match.id}`,
  };
}

// Used by /api/taste/suggest for the dropdown. Deliberately lighter than
// scrape(): no rating math, just enough to disambiguate visually.
export async function suggest(query: string): Promise<{ label: string; value: string }[]> {
  const results = await searchMovies(query);
  return results.slice(0, 6).map((r) => {
    const year = r.release_date?.slice(0, 4);
    const value = year ? `${r.title} (${year})` : r.title;
    return { label: value, value };
  });
}