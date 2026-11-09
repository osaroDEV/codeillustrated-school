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
  // The learner account pages moved from /auth/<page> to /<page>. Old links
  // (emails, bookmarks, the main site) keep working; query strings such as
  // ?redirectTo= carry over. /auth/confirm stays: the email templates use it.
  async redirects() {
    return ACCOUNT_PAGES.map((page) => ({
      source: `/auth/${page}`,
      destination: `/${page}`,
      permanent: true,
    }));
  },
};

// Same list as ACCOUNT_PATHS in lib/routes.ts (checked by lib/routes.test.ts).
const ACCOUNT_PAGES = ["login", "signup", "forgot-password", "reset-password", "verify-email"];

module.exports = nextConfig;
