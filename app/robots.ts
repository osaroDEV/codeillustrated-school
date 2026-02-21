import { BASE_PATH, SITE_URL } from "@/lib/seo";
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: `${BASE_PATH}/`,
        disallow: [`${BASE_PATH}/_next/`, `${BASE_PATH}/api/`],
      },
    ],
    sitemap: `${SITE_URL}${BASE_PATH}/sitemap.xml`,
  };
}
