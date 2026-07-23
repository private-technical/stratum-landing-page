// Import this directly into whichever components render the hero cards,
// waitlist cards, and final CTA cards, and pass it via the `loader` prop
// on each <Image>:
//
//   import cloudinaryLoader from "@/cloudinary-loader";
//   <Image loader={cloudinaryLoader} src="/some-card.jpg" ... />
//
// Do NOT register this in next.config.ts as a global loader — the
// navbar logo and other icons are local /public files and need Next's
// default loader to keep resolving correctly.
//
// Assumes your Cloudinary public IDs mirror the src path you pass in —
// e.g. src="/album-card.jpg" maps to the public ID "album-card" at the
// root of your media library. If your cards live in a Cloudinary folder
// instead (e.g. "stratum/cards/album-card"), adjust the returned
// template below to match your actual folder structure.
type CloudinaryLoaderProps = {
  src: string;
  width: number;
  quality?: number;
};

const CLOUD_NAME = "cgyxai8a";

export default function cloudinaryLoader({ src, width, quality }: CloudinaryLoaderProps): string {
  const params = ["f_auto", "c_limit", `w_${width}`, `q_${quality ?? "auto"}`];
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${params.join(",")}${src}`;
}
