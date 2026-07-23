import type { NextConfig } from "next";

const nextConfig = {
  images: {
    loader: 'cloudinary',
    path: 'https://res.cloudinary.com/cgyxai8a/image/upload/',
  },
};

export default nextConfig;
