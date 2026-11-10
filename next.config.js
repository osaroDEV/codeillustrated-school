/** @type {import('next').NextConfig} */

// Learner account pages that moved from /auth/<page> to /<page>.
// Same list as ACCOUNT_PATHS in lib/routes.ts (checked by lib/routes.test.ts).
const ACCOUNT_PAGES = ["login", "signup", "forgot-password", "reset-password", "verify-email"];

const LABS_URL = "https://labs.codeillustrated.com";

const nextConfig = {
  // Read at run time by lib/certificate-pdf.ts, so tracing can't find them.
  outputFileTracingIncludes: {
    "/api/certificates/[code]/pdf": ["./lib/fonts/**"],
  },
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      // The academy used to live at codeillustrated.com/academy. Old links
      // (emails, certificate PDFs, bookmarks, search results) go to the same
      // page at the root. API calls are rewritten below instead.
      { source: "/academy", destination: "/", permanent: true },
      { source: "/academy/:path((?!api(?:/|$)).*)", destination: "/:path", permanent: true },
      // Code Illustrated Labs moved from codeillustrated.com/labs to its own subdomain.
      { source: "/labs", destination: LABS_URL, permanent: true },
      { source: "/labs/:path*", destination: `${LABS_URL}/:path*`, permanent: true },
      // Query strings such as ?redirectTo= carry over. /auth/confirm stays:
      // the email templates use it.
      ...ACCOUNT_PAGES.map((page) => ({
        source: `/auth/${page}`,
        destination: `/${page}`,
        permanent: true,
      })),
    ];
  },
  async rewrites() {
    return {
      // Flutterwave's webhook and the Supabase scheduler POST to the old
      // /academy/api/… URLs and don't follow redirects, so serve them in place.
      beforeFiles: [{ source: "/academy/api/:path*", destination: "/api/:path*" }],
    };
  },
};

module.exports = nextConfig;
