/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: "/academy",
  assetPrefix: "/academy",
  images: {
    unoptimized: true,
    path: "/academy/_next/image",
  },
};

module.exports = nextConfig;
