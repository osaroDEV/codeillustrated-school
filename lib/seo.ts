/**
 * SEO constants and helpers for Code Illustrated Online School
 */

export const SITE_URL = "https://codeillustrated.com";
export const BASE_PATH = "/academy";
export const SITE_NAME = "Code Illustrated Online School";
export const SITE_DESCRIPTION =
  "1-on-1 coding training for complete beginners. Learn to code with personalized mentorship and become a software engineer.";

/**
 * Returns the full canonical URL for a given path.
 * @param path - The path relative to the base path (e.g., "/courses")
 */
export function getCanonicalUrl(path: string = ""): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${BASE_PATH}${cleanPath === "/" ? "" : cleanPath}`;
}

/**
 * Generates common Open Graph metadata fields.
 */
export function getOpenGraphDefaults(overrides?: {
  title?: string;
  description?: string;
  url?: string;
  images?: { url: string; width: number; height: number; alt: string }[];
}) {
  return {
    type: "website" as const,
    locale: "en_US",
    siteName: SITE_NAME,
    title: overrides?.title || SITE_NAME,
    description: overrides?.description || SITE_DESCRIPTION,
    url: overrides?.url || getCanonicalUrl(),
    images: overrides?.images || [
      {
        url: `${SITE_URL}${BASE_PATH}/code-ill.svg`,
        width: 1200,
        height: 630,
        alt: "Code Illustrated Online School - 1-on-1 Beginner Coding Training",
      },
    ],
  };
}

/**
 * Generates common Twitter card metadata fields.
 */
export function getTwitterDefaults(overrides?: {
  title?: string;
  description?: string;
  images?: string[];
}) {
  return {
    card: "summary_large_image" as const,
    title: overrides?.title || SITE_NAME,
    description: overrides?.description || SITE_DESCRIPTION,
    images: overrides?.images || [`${SITE_URL}${BASE_PATH}/code-ill.svg`],
  };
}
