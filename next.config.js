/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/academy',
  assetPrefix: '/academy',
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { 
    unoptimized: true,
    path: '/academy/_next/image',
  },
};

module.exports = nextConfig;
