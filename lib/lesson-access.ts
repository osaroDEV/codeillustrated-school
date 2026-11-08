import { hasSeatAccess, type SubscriptionState } from "./billing";

// Pure rules for the lesson player. Data access is in lib/lessons.ts.

export const COURSE_FILES_BUCKET = "course-files";
export const MAX_COURSE_FILE_BYTES = 50 * 1024 * 1024;

export type LessonAccess =
  | "staff" // admin, or the instructor of a cohort of this course
  | "enrolled" // a current seat in the course
  | "preview" // no seat, but this lesson is a free preview
  | "lapsed" // enrolled, but paused or the subscription ran out
  | "none"; // not enrolled

export function lessonAccess(input: {
  isStaff: boolean;
  enrollment: { status: string; source?: string | null } | null;
  subscription: SubscriptionState | null | undefined;
  isPreview: boolean;
  now?: Date;
}): LessonAccess {
  const { isStaff, enrollment, subscription, isPreview, now } = input;
  if (isStaff) return "staff";
  if (enrollment && enrollment.status !== "paused" && hasSeatAccess(enrollment, subscription, now)) {
    return "enrolled";
  }
  if (isPreview) return "preview";
  return enrollment ? "lapsed" : "none";
}

export function canViewLesson(access: LessonAccess): boolean {
  return access === "staff" || access === "enrolled" || access === "preview";
}

/** Only learners with a seat build up progress; previews and staff don't. */
export function canTrackProgress(access: LessonAccess): boolean {
  return access === "enrolled";
}

/** The iframe address for a YouTube or Vimeo link, or null for anything else. */
export function videoEmbedUrl(link: string): string | null {
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");
  const parts = url.pathname.split("/").filter(Boolean);
  const youtube = (id: string | null | undefined) =>
    id && /^[\w-]{6,}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;

  if (host === "youtu.be") return youtube(parts[0]);
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (parts[0] === "watch") return youtube(url.searchParams.get("v"));
    if (["embed", "shorts", "live"].includes(parts[0])) return youtube(parts[1]);
    return null;
  }

  const vimeo = (id: string | undefined, hash: string | null | undefined) => {
    if (!id || !/^\d+$/.test(id)) return null;
    const safeHash = hash && /^[0-9a-zA-Z]+$/.test(hash) ? `?h=${hash}` : "";
    return `https://player.vimeo.com/video/${id}${safeHash}`;
  };
  if (host === "vimeo.com") return vimeo(parts[0], parts[1]);
  if (host === "player.vimeo.com" && parts[0] === "video") return vimeo(parts[1], url.searchParams.get("h"));
  return null;
}

/** A storage path for an upload: a random prefix plus a tidied file name. */
export function storagePath(scope: "lessons" | "resources", fileName: string, random: string): string {
  const cleaned = fileName
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(-100);
  return `${scope}/${random}-${cleaned || "file"}`;
}

/** The original-looking file name of a stored path, for the download. */
export function storedFileName(path: string): string {
  return (path.split("/").pop() ?? "file").replace(/^[0-9a-f]{12}-/, "");
}
