import { NextRequest, NextResponse } from "next/server";
import { suggestForField } from "@/lib/taste/scrapers";
import type { TasteField } from "@/components/shared/taste-types";

const VALID_FIELDS: TasteField[] = ["album", "film", "book"];

// Short-lived, process-local cache: the same popular query ("dune",
// "midnights") gets asked by many different visitors, so caching a few
// minutes' worth avoids re-hitting TMDB/Open Library/Last.fm for
// something already just looked up. Resets on every deploy/restart,
// and if this runs across multiple serverless instances each gets its
// own copy, that's fine here, it's a speed boost, not a correctness
// requirement.
const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { expiresAt: number; suggestions: unknown[] }>();

// Deliberately separate from /api/taste/scrape: this route only searches
// (cheap, read-only, no cache writes) so it's safe to call on every
// keystroke's debounce without adding load to the cache-and-scrape path.
export async function GET(req: NextRequest) {
  const field = req.nextUrl.searchParams.get("field") as TasteField;
  const q = (req.nextUrl.searchParams.get("q") || "").trim();

  if (!VALID_FIELDS.includes(field) || q.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const cacheKey = `${field}:${q.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({ suggestions: cached.suggestions });
  }

  try {
    const suggestions = await suggestForField(field, q);
    cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, suggestions });
    return NextResponse.json({ suggestions });
  } catch (err) {
    console.warn(`[taste/suggest] failed for ${field} "${q}"`, err);
    return NextResponse.json({ suggestions: [] });
  }
}