export interface FanCard {
  id: string;
  src: string;
  alt: string;
  y: number;
  x: number;
  width: number;
  height: number;
  /** Optional manual z-index override (defaults to array order + 1) */
  zIndexOverride?: number;
}