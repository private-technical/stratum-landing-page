import type { MetadataRoute } from "next";

// Next.js auto-serves this at /manifest.webmanifest and auto-links it in
// <head> — no need to reference it manually from layout.tsx metadata.
// Place this file at app/manifest.ts.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Stratum",
    short_name: "Stratum",
    description:
      "Rate films, music, and books. Build a taste profile. Match with people who think like you.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      {
        src: "/Android_or_Chrome_Web_App.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/Android_High_Res_Web_App.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
