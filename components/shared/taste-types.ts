export type TasteField = "album" | "film" | "book";
export type TasteSource = "letterboxd" | "goodreads" | "rateyourmusic";

// One source per pick field — Letterboxd for films, Goodreads for books,
// RateYourMusic for albums. Keeping this mapping in one place means the
// scrape route, the PocketBase join handler, and the display component
// all agree on which source backs which field.
export const SOURCE_BY_FIELD: Record<TasteField, TasteSource> = {
  film: "letterboxd",
  book: "goodreads",
  album: "rateyourmusic",
};

export const SOURCE_LABEL: Record<TasteSource, string> = {
  letterboxd: "Letterboxd",
  goodreads: "Goodreads",
  rateyourmusic: "RateYourMusic",
};

export interface TasteMatchLocation {
  field: TasteField;
  title: string;
  source: TasteSource;
  matchCount: number;
  sampleUsernames: string[];
  sourceUrl: string | null;
}
