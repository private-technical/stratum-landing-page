export type { TasteField, TasteSource } from "../../components/shared/taste-types";

export interface ScrapeResult {
  matchCount: number;
  matchedTitle: string;
  sourceUrl: string;
}