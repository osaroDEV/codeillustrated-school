import { getCurrentUser } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase";
import { getCourses } from "@/lib/courses";
import { CourseIcon } from "@/components/course-icon";
import { RedeemCodeCard } from "@/components/dashboard/redeem-code-card";
import { LocalTime } from "@/components/local-time";
import { getLearnerSessions, type LearnerSession } from "@/lib/cohorts";
import { nextSessionAt } from "@/lib/schedule";
import { hasSeatAccess, type SubscriptionState } from "@/lib/billing";
import { getCourseOutlines, getCourseRecordings, getCourseResources, type CourseRecording, type CourseResource, type OutlineModule } from "@/lib/lessons";
import Link from "next/link";
import { Calendar, CheckCircle2, ChevronDown, Circle, Clock, BookOpen, ExternalLink, FileText, PlayCircle } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Courses | Code Illustrated Dashboard",
};

function isSelfPaced(enrollment: { source?: string | null; subscriptions?: unknown }) {
  const sub = enrollment.subscriptions as { offerings: { kind: string } | null } | null | undefined;
  return enrollment.source === "subscription" && sub?.offerings?.kind === "self_paced";
}

async function getEnrollments() {
  const empty = {
    enrollments: [],
    sessions: [] as LearnerSession[],
    outlines: new Map<string, OutlineModule[]>(),
    resources: [] as CourseResource[],
    courseRecordings: [] as CourseRecording[],
  };
  try {
    const user = await getCurrentUser();
    if (!user) return empty;

    const admin = createAdminClient();
    const [{ data }, sessions] = await Promise.all([
      admin
        .from("enrollments")
        .select("*, cohorts(name), subscriptions(status, current_period_end, offerings(kind))")
        .eq("user_id", user.id),
      getLearnerSessions(admin, user.id).catch(() => [] as LearnerSession[]),
    ]);
    const courseIds = (data ?? []).map((e) => e.course_id as string);
    const selfPacedIds = (data ?? []).filter(isSelfPaced).map((e) => e.course_id as string);
    const [outlines, resources, courseRecordings] = await Promise.all([
      getCourseOutlines(admin, user.id, courseIds),
      getCourseResources(admin, courseIds),
      getCourseRecordings(admin, selfPacedIds),
    ]);
    return { enrollments: data || [], sessions, outlines, resources, courseRecordings };
  } catch {
    return empty;
  }
}

export default async function CoursesPage() {
  const [{ enrollments, sessions, outlines, resources, courseRecordings }, courses] = await Promise.all([getEnrollments(), getCourses()]);

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">My Courses</h1>
        <p className="text-white/40 text-sm mt-1">Track your progress across all enrolled courses</p>
      </div>

      {enrollments.length === 0 ? (
        <div className="text-center py-16 bg-white/[0.03] border border-white/[0.08] rounded-2xl">
          <BookOpen className="w-12 h-12 text-white/15 mx-auto mb-4" />
          <p className="text-white/40 font-medium">No courses enrolled yet</p>
          <p className="text-white/25 text-sm mt-1">Browse our courses, or redeem an invite code below</p>
        </div>
      ) : (
        <div className="space-y-6">
          {enrollments.map((enrollment) => {
            const course = courses.find((c) => c.id === enrollment.course_id);
            const modules = outlines.get(enrollment.course_id) ?? [];
            const firstUnfinished = modules.findIndex((m) => m.lessons.some((l) => !l.done));
            const nextAt = nextSessionAt(enrollment, sessions);
            const cohortName = (enrollment.cohorts as { name: string } | null)?.name;
            const lapsed = !hasSeatAccess(enrollment, enrollment.subscriptions as SubscriptionState | null);
            const courseResources = resources.filter((r) => r.course_id === enrollment.course_id);
            const selfPaced = isSelfPaced(enrollment);
            const selfPacedRecordings = courseRecordings.filter(
              (r) => r.course_id === enrollment.course_id && /^https?:\/\//i.test(r.recording_url)
            );
            const recordings = sessions.filter(
              (s) => s.cohort_id === enrollment.cohort_id && s.recording_url
            ).length;

            return (
              <div
                key={enrollment.id}
                className="bg-white/[0.04] border border-white/[0.08] rounded-2xl overflow-hidden hover:border-white/[0.15] transition-all"
              >
                {/* Course header */}
                <div className="p-6 border-b border-white/[0.06]">
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 ${course?.bg || "bg-white/10"} rounded-2xl flex items-center justify-center flex-shrink-0`}>
                      {course && <CourseIcon icon={course.icon} className={`w-7 h-7 ${course.color}`} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <h2 className="text-white font-bold text-lg">{course?.title || enrollment.course_id}</h2>
                          <p className="text-white/40 text-sm">{course?.age} · {course?.duration} · {course?.level}</p>
                          {cohortName && <p className="text-[#3da3bc] text-xs mt-0.5">Cohort: {cohortName}</p>}
                          {selfPaced && <p className="text-[#3da3bc] text-xs mt-0.5">Self-paced</p>}
                        </div>
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                          enrollment.status === "active"
                            ? "bg-green-500/15 text-green-400 border border-green-500/20"
                            : enrollment.status === "completed"
                            ? "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                            : "bg-yellow-500/15 text-yellow-400 border border-yellow-500/20"
                        }`}>
                          {enrollment.status === "active" ? "In Progress" : enrollment.status === "completed" ? "Completed" : "Paused"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="mt-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white/50 text-sm">Overall Progress</span>
                      <span className="text-white font-bold">{enrollment.progress || 0}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-white/[0.08] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#c31d24] to-[#f5a623] transition-all duration-700"
                        style={{ width: `${enrollment.progress || 0}%` }}
                      />
                    </div>
                    {enrollment.progress === 100 && (
                      <div className="flex items-center gap-2 mt-2 text-green-400 text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Course completed!
                      </div>
                    )}
                  </div>
                </div>

                {lapsed && (
                  <div className="mx-6 mt-4 px-4 py-3 rounded-xl bg-[#ffbd59]/10 border border-[#ffbd59]/30 text-[#ffbd59] text-sm flex items-center justify-between gap-3 flex-wrap">
                    <span>Your subscription has lapsed. Renew it to open your lessons, join classes and watch recordings again.</span>
                    <Link href="/dashboard/billing" className="font-semibold underline underline-offset-2">Billing</Link>
                  </div>
                )}

                {/* Session info */}
                <div className="px-6 py-4 flex items-center gap-6 flex-wrap">
                  {nextAt && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#ffbd59]" />
                      <div>
                        <p className="text-white/40 text-[10px] uppercase tracking-wider">Next Session</p>
                        <LocalTime
                          iso={nextAt}
                          format={{ weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }}
                          className="text-white text-sm font-medium"
                        />
                      </div>
                    </div>
                  )}
                  {recordings > 0 && (
                    <Link href="/dashboard/schedule" className="flex items-center gap-2 group">
                      <BookOpen className="w-4 h-4 text-[#c31d24]" />
                      <div>
                        <p className="text-white/40 text-[10px] uppercase tracking-wider">Recordings</p>
                        <p className="text-white text-sm font-medium group-hover:text-[#ffbd59] transition-colors">
                          {recordings} available →
                        </p>
                      </div>
                    </Link>
                  )}
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#3da3bc]" />
                    <div>
                      <p className="text-white/40 text-[10px] uppercase tracking-wider">Enrolled</p>
                      <p className="text-white text-sm font-medium">
                        {new Date(enrollment.enrolled_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Lessons */}
                {modules.length > 0 && (
                  <div className="px-6 pb-6">
                    <p className="text-white/30 text-xs uppercase tracking-wider mb-3">Lessons</p>
                    <div className="space-y-2">
                      {modules.map((mod, i) => {
                        const finished = mod.lessons.filter((l) => l.done).length;
                        return (
                          <details key={mod.id} open={i === firstUnfinished} className="group rounded-xl border bg-white/[0.02] border-white/[0.06]">
                            <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                              <span className="flex-1 text-sm text-white/80">{mod.title}</span>
                              <span className="text-white/35 text-xs">{finished}/{mod.lessons.length}</span>
                              <ChevronDown className="w-4 h-4 text-white/30 transition-transform group-open:rotate-180" />
                            </summary>
                            <ul className="px-2 pb-2">
                              {mod.lessons.map((l) => (
                                <li key={l.id}>
                                  <Link
                                    href={`/dashboard/courses/${enrollment.course_id}/lessons/${l.id}`}
                                    className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/[0.05]"
                                  >
                                    {l.done ? <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" /> : <Circle className="w-4 h-4 text-white/25 shrink-0" />}
                                    <span className="truncate">{l.title}</span>
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </details>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Recordings for self-paced subscribers, from any cohort */}
                {selfPaced && !lapsed && enrollment.status !== "paused" && selfPacedRecordings.length > 0 && (
                  <div className="px-6 pb-6">
                    <p className="text-white/30 text-xs uppercase tracking-wider mb-3">Class recordings</p>
                    <div className="space-y-2">
                      {selfPacedRecordings.map((r) => (
                        <a
                          key={r.id}
                          href={r.recording_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-white/[0.02] border-white/[0.06] hover:border-white/[0.15] transition-colors"
                        >
                          <PlayCircle className="w-4 h-4 text-[#3da3bc] shrink-0" />
                          <span className="min-w-0 flex-1 text-sm text-white/80 truncate">{r.title}</span>
                          <LocalTime iso={r.starts_at} format={{ day: "numeric", month: "short", year: "numeric" }} className="text-white/35 text-xs shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resources */}
                {!lapsed && enrollment.status !== "paused" && courseResources.length > 0 && (
                  <div className="px-6 pb-6">
                    <p className="text-white/30 text-xs uppercase tracking-wider mb-3">Resources</p>
                    <div className="space-y-2">
                      {courseResources.map((r) => (
                        <a
                          key={r.id}
                          href={`/academy/api/resources/${r.id}/open`}
                          target="_blank"
                          rel="noopener"
                          className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-white/[0.02] border-white/[0.06] hover:border-white/[0.15] transition-colors"
                        >
                          {r.kind === "file" ? <FileText className="w-4 h-4 text-[#3da3bc] shrink-0" /> : <ExternalLink className="w-4 h-4 text-[#3da3bc] shrink-0" />}
                          <span className="min-w-0">
                            <span className="block text-sm text-white/80 truncate">{r.title}</span>
                            {r.description && <span className="block text-xs text-white/40 truncate">{r.description}</span>}
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {enrollment.notes && (
                  <div className="px-6 pb-6">
                    <div className="bg-[#ffbd59]/5 border border-[#ffbd59]/15 rounded-xl p-4">
                      <p className="text-[#ffbd59] text-xs font-semibold uppercase tracking-wider mb-1.5">Instructor Notes</p>
                      <p className="text-white/60 text-sm leading-relaxed">{enrollment.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-8">
        <RedeemCodeCard />
      </div>
    </div>
  );
}
