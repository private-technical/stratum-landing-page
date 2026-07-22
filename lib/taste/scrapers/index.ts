import type { TasteField } from "../../../components/shared/taste-types";
import type { ScrapeResult } from "../types";
import { scrape as scrapeFilm, suggest as suggestFilm } from "./tmdb";
import { scrape as scrapeBook, suggest as suggestBook } from "./open-library";
import { scrape as scrapeAlbum, suggest as suggestAlbum } from "./lastfm";

export async function scrapeForField(field: TasteField, title: string): Promise<ScrapeResult | null> {
  switch (field) {
    case "film":
      return scrapeFilm(title);
    case "book":
      return scrapeBook(title);
    case "album":
      return scrapeAlbum(title);
    default:
      return null;
  }
}

export async function suggestForField(
  field: TasteField,
  query: string
): Promise<{ label: string; value: string }[]> {
  switch (field) {
    case "film":
      return suggestFilm(query);
    case "book":
      return suggestBook(query);
    case "album":
      return suggestAlbum(query);
    default:
      return [];
  }
}