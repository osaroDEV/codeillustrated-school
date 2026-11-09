/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: "/academy",
  // Read at run time by lib/certificate-pdf.ts, so tracing can't find them.
  outputFileTracingIncludes: {
    "/api/certificates/[code]/pdf": ["./lib/fonts/**"],
  },
  assetPrefix: "/academy",
  images: {
    unoptimized: true,
    path: "/academy/_next/image",
  },
};

module.exports = nextConfig;
