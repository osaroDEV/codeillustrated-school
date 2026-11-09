import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, Download, ExternalLink, Lock, PlayCircle, Video } from "lucide-react";
import { createAdminClient } from "@/lib/supabase";
import { requireUser } from "@/lib/supabase-server";
import { canTrackProgress, canViewLesson, storedFileName, videoEmbedUrl } from "@/lib/lesson-access";
import { getCourseOutlines, getLessonBlocks, getLessonClasses, getLessonRecordings, loadLesson, type LessonBlock, type LessonClass, type OutlineModule } from "@/lib/lessons";
import { joinState } from "@/lib/schedule";
import { LocalTime } from "@/components/local-time";
import { CompleteButton } from "@/components/lessons/complete-button";
import { LessonMarkdown } from "@/components/lessons/lesson-markdown";

export const metadata: Metadata = { title: "Lesson | Code Illustrated Dashboard" };
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ courseId: string; lessonId: string }> };

const lessonHref = (courseId: string, lessonId: string) => `/dashboard/courses/${courseId}/lessons/${lessonId}`;

export default async function LessonPage({ params }: Params) {
  const { courseId, lessonId } = await params;
  const user = await requireUser();
  const admin = createAdminClient();

  const found = await loadLesson(admin, user, lessonId);
  if (!found || found.courseId !== courseId) notFound();
  const { lesson, seat } = found;

  const { data: course } = await admin.from("courses").select("title, slug").eq("id", courseId).maybeSingle();
  const courseTitle = course?.title ?? "Course";

  if (!canViewLesson(seat.access)) {
    const lapsedSubscription = seat.access === "lapsed" && seat.source === "subscription";
    return (
      <div className="p-6 lg:p-8 max-w-xl mx-auto">
        <div className="text-center py-14 px-6 bg-white/[0.04] border border-white/[0.08] rounded-2xl">
          <Lock className="w-10 h-10 text-white/25 mx-auto mb-4" />
          <h1 className="text-white font-bold text-lg">{lesson.title}</h1>
          <p className="text-white/50 text-sm mt-2">
            {seat.access === "none"
              ? `Enrol in ${courseTitle} to open this lesson.`
              : lapsedSubscription
                ? "Your subscription has lapsed. Renew it to open your lessons again."
                : "Your place on this course is paused. Please contact us to pick it up again."}
          </p>
          <Link
            href={seat.access === "none" && course ? `/courses/${course.slug}#enroll` : lapsedSubscription ? "/dashboard/billing" : "/contact-us"}
            className="inline-block mt-5 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#c31d24] to-[#f5a623]"
          >
            {seat.access === "none" ? "See enrolment options" : lapsedSubscription ? "Go to billing" : "Contact us"}
          </Link>
        </div>
      </div>
    );
  }

  const [outlines, blocks, classes] = await Promise.all([
    getCourseOutlines(admin, user.id, [courseId]),
    getLessonBlocks(admin, lesson.id),
    seat.access !== "enrolled"
      ? Promise.resolve([])
      : seat.selfPaced
        ? getLessonRecordings(admin, lesson.id)
        : getLessonClasses(admin, lesson.id, seat.cohortId),
  ]);
  const modules = outlines.get(courseId) ?? [];
  const flat = modules.flatMap((m) => m.lessons);
  const index = flat.findIndex((l) => l.id === lesson.id);
  const openable = (l: (typeof flat)[number]) => seat.access !== "preview" || l.is_preview;
  const prev = flat.slice(0, Math.max(index, 0)).reverse().find(openable) ?? null;
  const next = index >= 0 ? flat.slice(index + 1).find(openable) ?? null : null;
  const nextHref = next ? lessonHref(courseId, next.id) : null;
  const done = index >= 0 && flat[index].done;

  const empty = blocks.length === 0 && lesson.type !== "live";

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <Link href="/dashboard/courses" className="inline-flex items-center gap-1.5 text-white/40 hover:text-white text-xs mb-4">
        <ArrowLeft className="w-3.5 h-3.5" /> My Courses
      </Link>

      <div className="grid lg:grid-cols-[1fr_300px] gap-8 items-start">
        <div className="min-w-0">
          <p className="text-[#3da3bc] text-xs font-semibold">{courseTitle}</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1">{lesson.title}</h1>
          {lesson.duration_min && <p className="text-white/40 text-sm mt-1">{lesson.duration_min} minutes</p>}
          {seat.access === "preview" && (
            <p className="mt-3 inline-block text-xs font-semibold text-[#ffbd59] bg-[#ffbd59]/10 border border-[#ffbd59]/25 rounded-full px-3 py-1">
              Free preview
            </p>
          )}

          <div className="mt-6 space-y-6">
            {lesson.type === "live" && <LiveClasses classes={classes} enrolled={seat.access === "enrolled"} selfPaced={seat.selfPaced} />}
            {blocks.map((block) => (
              <Block key={block.id} block={block} lessonTitle={lesson.title} />
            ))}
            {empty && <p className="text-white/40 text-sm">The material for this lesson hasn&apos;t been added yet.</p>}
          </div>

          <div className="mt-8 pt-6 border-t border-white/[0.08] flex items-center justify-between gap-4 flex-wrap">
            {canTrackProgress(seat.access) ? <CompleteButton lessonId={lesson.id} done={done} nextHref={nextHref} /> : <span />}
            <div className="flex items-center gap-4 text-sm">
              {prev && (
                <Link href={lessonHref(courseId, prev.id)} className="inline-flex items-center gap-1 text-white/50 hover:text-white">
                  <ArrowLeft className="w-4 h-4" /> Previous
                </Link>
              )}
              {next && (
                <Link href={lessonHref(courseId, next.id)} className="inline-flex items-center gap-1 text-white/50 hover:text-white">
                  Next <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>
        </div>

        <CourseOutline courseId={courseId} modules={modules} currentId={lesson.id} previewOnly={seat.access === "preview"} />
      </div>
    </div>
  );
}

function Block({ block, lessonTitle }: { block: LessonBlock; lessonTitle: string }) {
  if (block.kind === "text") return <LessonMarkdown>{block.content ?? ""}</LessonMarkdown>;

  if (block.kind === "file") {
    return (
      <a
        href={`/academy/api/lesson-blocks/${block.id}/file`}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-white/10 hover:bg-white/15 border border-white/10"
      >
        <Download className="w-4 h-4" /> {block.title || storedFileName(block.file_path ?? "")}
      </a>
    );
  }

  const link = block.video_url ?? "";
  const embed = videoEmbedUrl(link);
  if (!embed) {
    return (
      <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-[#3da3bc] hover:text-white text-sm">
        <PlayCircle className="w-4 h-4" /> {block.title || "Watch the video"} <ExternalLink className="w-3.5 h-3.5" />
      </a>
    );
  }
  return (
    <figure>
      <div className="aspect-video rounded-2xl overflow-hidden bg-black border border-white/10">
        <iframe
          src={embed}
          title={block.title || lessonTitle}
          className="w-full h-full"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
      {block.title && <figcaption className="text-white/50 text-sm mt-2">{block.title}</figcaption>}
    </figure>
  );
}

function LiveClasses({ classes, enrolled, selfPaced }: { classes: LessonClass[]; enrolled: boolean; selfPaced: boolean }) {
  if (classes.length === 0 && selfPaced) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/60">
        <Video className="w-5 h-5 text-[#3da3bc] shrink-0" />
        <span>This lesson is taught in our live classes. If a recording is shared, it will appear here.</span>
      </div>
    );
  }
  if (classes.length === 0) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/60">
        <Video className="w-5 h-5 text-[#3da3bc] shrink-0" />
        <span>
          This lesson is taught live.{" "}
          {enrolled && <Link href="/dashboard/schedule" className="text-[#3da3bc] underline underline-offset-2">See your class schedule</Link>}
        </span>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {classes.map((c) => {
        const state = joinState(c);
        return (
          <div key={c.id} className="flex items-center justify-between gap-3 flex-wrap p-4 rounded-xl bg-white/[0.04] border border-white/[0.08]">
            <div>
              <p className="text-white text-sm font-medium">{c.title || "Live class"}</p>
              <LocalTime iso={c.starts_at} className="text-white/50 text-xs" />
            </div>
            <div className="flex items-center gap-3 text-sm">
              {state === "open" && !selfPaced && (
                <a href={`/academy/api/sessions/${c.id}/join`} className="px-4 py-2 rounded-xl font-semibold text-white bg-gradient-to-r from-[#c31d24] to-[#f5a623]">
                  Join class
                </a>
              )}
              {c.recording_url && /^https?:\/\//i.test(c.recording_url) && (
                <a href={c.recording_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[#3da3bc] hover:text-white">
                  <PlayCircle className="w-4 h-4" /> Watch recording
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CourseOutline({
  courseId,
  modules,
  currentId,
  previewOnly,
}: {
  courseId: string;
  modules: OutlineModule[];
  currentId: string;
  previewOnly: boolean;
}) {
  return (
    <aside className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
      {modules.map((m) => (
        <div key={m.id} className="mb-4 last:mb-0">
          <p className="text-white/40 text-[11px] uppercase tracking-wider mb-2">{m.title}</p>
          <ul className="space-y-0.5">
            {m.lessons.map((l) => {
              const locked = previewOnly && !l.is_preview;
              const icon = locked ? (
                <Lock className="w-3.5 h-3.5 text-white/20 shrink-0" />
              ) : l.done ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
              ) : (
                <Circle className="w-3.5 h-3.5 text-white/25 shrink-0" />
              );
              const className = `flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm ${
                l.id === currentId ? "bg-white/10 text-white" : locked ? "text-white/30" : "text-white/60 hover:text-white hover:bg-white/[0.05]"
              }`;
              return (
                <li key={l.id}>
                  {locked ? (
                    <span className={className}>{icon}<span className="truncate">{l.title}</span></span>
                  ) : (
                    <Link href={lessonHref(courseId, l.id)} aria-current={l.id === currentId ? "page" : undefined} className={className}>
                      {icon}<span className="truncate">{l.title}</span>
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </aside>
  );
}
