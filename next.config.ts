import type { NextConfig } from "next";

// No global images.loader here on purpose. Only the hero/waitlist/final
// CTA cards live on Cloudinary — the navbar logo, favicons, and other
// icons are local /public files that need Next's default loader to keep
// working. A global custom loader would apply to every <Image>, which
// would break those local assets. Instead, the Cloudinary transform is
// applied per-component via the `loader` prop — see cloudinary-loader.ts.
const nextConfig: NextConfig = {};

export default nextConfig;