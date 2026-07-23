import { NextRequest, NextResponse } from "next/server";
import { scrapeForField } from "@/lib/taste/scrapers";
import { normalizeTitle } from "@/lib/taste/normalize";
import type { TasteField } from "@/components/shared/taste-types";

// Server-side PocketBase URL — reuses the same public env var the rest
// of the app already reads from, since PocketBase itself is exposed the
// same way whether the caller is the browser or this route.
const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || "https://kvxjstklylu1j2p.ba7w.pocketbasecloud.com";

// Shared secret so only this route (not randoms hitting PocketBase
// directly) can write cache entries. Must be set to the exact same
// value as PocketBase's own TASTE_WORKER_SECRET (see the POST
// /api/taste/cache handler in pb_hooks/main.pb.js, which checks
// incoming requests against that same variable name). Using one
// shared name on both sides means there's nothing to keep in sync by
// hand.
const CACHE_WRITE_SECRET = process.env.TASTE_WORKER_SECRET;

const VALID_FIELDS: TasteField[] = ["album", "film", "book"];

export async function POST(req: NextRequest) {
  let body: { field?: string; title?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const field = body.field as TasteField;
  const title = (body.title || "").trim();

  if (!VALID_FIELDS.includes(field) || title.length < 2 || title.length > 200) {
    return NextResponse.json({ error: "Invalid field or title." }, { status: 400 });
  }

  const normalized = normalizeTitle(title);

  // Cache check first — this is what makes "never scrape the same title
  // twice" true. Deliberately keyed on the normalized TITLE, not on the
  // user: two different people typing "OK Computer" hit the same cache
  // entry, so popular picks only ever get scraped once, ever.
  const cached = await readCache(field, normalized);
  if (cached) {
    return NextResponse.json({ status: "cached" });
  }

  // Claim the slot before scraping so two near-simultaneous debounce
  // fires (two tabs, a fast retype) don't both hit the source site.
  await writeCache(field, normalized, { status: "pending" });

  try {
    const result = await scrapeForField(field, title);
    if (!result) {
      console.warn(`[taste/scrape] no match: ${field} "${title}"`);
      await writeCache(field, normalized, { status: "error" });
      return NextResponse.json({ status: "no_match" });
    }
    console.info(
      `[taste/scrape] matched: ${field} "${title}" -> ${result.matchCount} (${result.sourceUrl})`
    );
    await writeCache(field, normalized, { status: "done", ...result });
    return NextResponse.json({ status: "done" });
  } catch (err) {
    console.warn(`[taste/scrape] threw: ${field} "${title}"`, err);
    await writeCache(field, normalized, { status: "error" });
    return NextResponse.json({ status: "error" }, { status: 502 });
  }
}

async function readCache(field: TasteField, normalizedTitle: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${POCKETBASE_URL}/api/taste/cache?field=${field}&title=${encodeURIComponent(normalizedTitle)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return false;
    // A record existing isn't the same thing as a usable result: it
    // could be stuck at "pending" (an interrupted request that never
    // finished) or "error" (a scrape that ran and found nothing). Only
    // "done" means there's an actual match sitting in the cache. This
    // used to just check res.ok, which meant a title that failed once
    // was locked out of ever being retried again.
    const data = await res.json().catch(() => null);
    return data?.status === "done";
  } catch {
    // If PocketBase is unreachable, fall through and scrape anyway
    // rather than silently doing nothing — worst case is a redundant
    // scrape, not a permanently missing match.
    return false;
  }
}

async function writeCache(
  field: TasteField,
  normalizedTitle: string,
  data: Record<string, unknown>
): Promise<void> {
  if (!CACHE_WRITE_SECRET) {
    // Misconfigured: TASTE_WORKER_SECRET isn't set for this process.
    // This used to be a silent no-op, which is exactly what made a
    // missing secret indistinguishable from every scrape genuinely
    // finding zero matches. Logging it is the fix.
    console.warn(
      "[taste/scrape] TASTE_WORKER_SECRET is not set. Skipping cache write. Scraped results will not be saved, so matches will keep coming back empty until this is set."
    );
    return;
  }
  try {
    await fetch(`${POCKETBASE_URL}/api/taste/cache`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-taste-worker-secret": CACHE_WRITE_SECRET,
      },
      body: JSON.stringify({ field, normalizedTitle, ...data }),
    });
  } catch (err) {
    // Best-effort — a failed cache write just means this title gets
    // re-scraped next time someone types it, not a broken request.
    // Still worth a log line so a persistent failure (bad
    // POCKETBASE_URL, PocketBase down, etc.) doesn't go unnoticed.
    console.warn("[taste/scrape] cache write failed", err);
  }
}