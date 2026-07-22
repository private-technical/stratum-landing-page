import type { ScrapeResult } from "../types";

const SEARCH_BASE = "https://openlibrary.org/search.json";

// Below this average (out of 5), a book is treated as having no "people
// loved this" match at all, regardless of ratings count. Open Library
// doesn't expose a per-star breakdown on this endpoint (there's a
// separate, thinly-covered ratings.json per work that isn't worth an
// extra request for most titles), so this average-rating floor is the
// closest honest stand-in for "people who rated it highly" available.
const MIN_AVERAGE_RATING = 4.0;

interface OpenLibraryDoc {
  key: string;
  title: string;
  author_name?: string[];
  ratings_average?: number;
  ratings_count?: number;
}

function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Picks selected from the suggestion dropdown are stored as
// "Title by Author" so the exact book is known, not just guessed at
// from a bare title. Free-typed values without a selection just won't
// match this pattern and fall through to fuzzy matching, same as before.
function parseDisambiguated(input: string): { title: string; author: string | null } {
  const match = input.match(/^(.*)\sby\s(.+)$/i);
  if (!match) return { title: input, author: null };
  return { title: match[1].trim(), author: match[2].trim() };
}

async function searchBooks(title: string, author: string | null): Promise<OpenLibraryDoc[]> {
  try {
    // Open Library only returns a restricted default field set unless
    // specific fields are requested by name, so ratings_average and
    // ratings_count have to be listed explicitly or they won't come
    // back in the response at all.
    const params = new URLSearchParams({
      title,
      fields: "key,title,author_name,ratings_average,ratings_count",
      limit: "10",
    });
    if (author) params.set("author", author);
    const res = await fetch(`${SEARCH_BASE}?${params.toString()}`, {
      // Open Library asks API consumers to identify themselves with a
      // descriptive User-Agent, no key involved, just good etiquette
      // on a free, donation-funded service.
      headers: { "User-Agent": "StratumWaitlist/1.0 (contact: stratum.technical@gmail.com)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.warn(`[open-library] ${res.status} searching for "${title}"`);
      return [];
    }
    const data = await res.json();
    return (data.docs || []) as OpenLibraryDoc[];
  } catch (err) {
    console.warn(`[open-library] search failed for "${title}"`, err);
    return [];
  }
}

// Prefers an exact normalized title match. When an author was supplied
// (dropdown selection), the search itself was already narrowed with
// author=, so this mostly just picks among a much smaller candidate
// set. Falls back to whichever candidate has the most ratings when
// there's no exact title match, a guess at which edition or same-named
// book is meant, not a guarantee.
function pickBestMatch(title: string, docs: OpenLibraryDoc[]): OpenLibraryDoc | null {
  if (docs.length === 0) return null;
  const target = normalizeForMatch(title);
  const exact = docs.find((d) => normalizeForMatch(d.title) === target);
  if (exact) return exact;
  return [...docs].sort((a, b) => (b.ratings_count || 0) - (a.ratings_count || 0))[0];
}

export async function scrape(input: string): Promise<ScrapeResult | null> {
  const { title, author } = parseDisambiguated(input);
  const docs = await searchBooks(title, author);
  const match = pickBestMatch(title, docs);
  if (!match || !match.ratings_count) return null;
  if ((match.ratings_average || 0) < MIN_AVERAGE_RATING) return null;

  return {
    matchCount: match.ratings_count,
    matchedTitle: match.title,
    sourceUrl: `https://openlibrary.org${match.key}`,
  };
}

// Used by /api/taste/suggest for the dropdown. Deliberately lighter
// than scrape(): no rating math, just enough to disambiguate visually.
export async function suggest(query: string): Promise<{ label: string; value: string }[]> {
  const docs = await searchBooks(query, null);
  return docs.slice(0, 6).map((d) => {
    const author = d.author_name?.[0];
    const value = author ? `${d.title} by ${author}` : d.title;
    return { label: value, value };
  });
}
