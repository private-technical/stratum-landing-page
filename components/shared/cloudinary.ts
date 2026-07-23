// Single source of truth for turning a raw Cloudinary URL into a
// right-sized, modern-format delivery URL. f_auto serves AVIF/WebP where
// supported; q_auto is Cloudinary's perceptual quality tuning; dpr_auto +
// w_ fetch close to the pixels the layout actually needs.
//
// Two call sites need two different shapes:
//  - cld(url, width)              — for a plain <img src={cld(...)} />
//  - cloudinaryLoader({src, width, quality}) — for next/image's `loader`
//    prop, whose signature is fixed by Next itself.
// Both just format the same transform string, so the string-building
// lives here once instead of twice.
function buildTransformedUrl(url: string, width: number, quality?: number): string {
  const w = Math.max(1, Math.round(width));
  const q = quality ?? "auto";
  return url.replace("/upload/", `/upload/f_auto,q_${q},dpr_auto,w_${w},c_limit/`);
}

export function cld(url: string, width: number): string {
  return buildTransformedUrl(url, width);
}

export function cloudinaryLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  return buildTransformedUrl(src, width, quality);
}
