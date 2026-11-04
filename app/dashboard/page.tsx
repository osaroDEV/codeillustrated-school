import { getCurrentUser } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase";
import { getCourses } from "@/lib/courses";
import { CourseIcon } from "@/components/course-icon";
import { RedeemCodeCard } from "@/components/dashboard/redeem-code-card";
import { LocalTime } from "@/components/local-time";
import { UpcomingSessions } from "@/components/schedule/session-list";
import { getLearnerSessions } from "@/lib/cohorts";
import { nextSessionAt } from "@/lib/schedule";
import {
  BookOpen, TrendingUp, Calendar, Megaphone,
  Clock, ChevronRight, Zap, FileText,
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard Overview | Code Illustrated",
};

async function getDashboardData() {
  try {
    const user = await getCurrentUser();
    if (!user) return null;

    const admin = createAdminClient();

    const [profileRes, enrollmentsRes, announcementsRes, notesRes, sessions] = await Promise.all([
      admin.from("profiles").select("full_name").eq("id", user.id).single(),
      admin.from("enrollments").select("*").eq("user_id", user.id),
      admin.from("announcements").select("*").order("created_at", { ascending: false }).limit(3),
      admin.from("learner_notes").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      getLearnerSessions(admin, user.id).catch(() => []),
    ]);

    return {
      user,
      profile: profileRes.data ?? null,
      enrollments: enrollmentsRes.error ? [] : (enrollmentsRes.data ?? []),
      announcements: announcementsRes.error ? [] : (announcementsRes.data ?? []),
      notes: notesRes.error ? [] : (notesRes.data ?? []),
      sessions,
    };
  } catch {
    return null;
  }
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const [data, courses] = await Promise.all([getDashboardData(), getCourses()]);
  const firstName =
    data?.profile?.full_name?.split(" ")[0] ||
    (data?.user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] ||
    data?.user?.email?.split("@")[0] ||
    "Learner";
  const enrollments = data?.enrollments || [];
  const announcements = data?.announcements || [];
  const notes = data?.notes || [];
  const sessions = data?.sessions || [];
  const courseTitles = Object.fromEntries(courses.map((c) => [c.id, c.title]));

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <p className="text-white/40 text-sm mb-1">{getGreeting()},</p>
        <h1 className="text-3xl font-bold text-white">
          {firstName} 👋
        </h1>
        <p className="text-white/40 text-sm mt-1">Here&apos;s your learning progress at a glance</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-[#c31d24]/15 rounded-xl flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-[#c31d24]" />
            </div>
            <span className="text-white/50 text-sm">Enrolled</span>
          </div>
          <p className="text-3xl font-bold text-white">{enrollments.length}</p>
          <p className="text-white/30 text-xs mt-1">
            {enrollments.length === 1 ? "course" : "courses"}
          </p>
        </div>

        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-[#1a596c]/20 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-[#3da3bc]" />
            </div>
            <span className="text-white/50 text-sm">Avg. Progress</span>
          </div>
          <p className="text-3xl font-bold text-white">
            {enrollments.length > 0
              ? Math.round(enrollments.reduce((a, e) => a + (e.progress || 0), 0) / enrollments.length)
              : 0}%
          </p>
          <p className="text-white/30 text-xs mt-1">across all courses</p>
        </div>

        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-[#ffbd59]/10 rounded-xl flex items-center justify-center">
              <Megaphone className="w-4 h-4 text-[#ffbd59]" />
            </div>
            <span className="text-white/50 text-sm">Announcements</span>
          </div>
          <p className="text-3xl font-bold text-white">{announcements.length}</p>
          <p className="text-white/30 text-xs mt-1">from your school</p>
        </div>
      </div>

      {sessions.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Upcoming Classes</h2>
            <Link href="/dashboard/schedule" className="text-white/40 hover:text-white text-xs flex items-center gap-1 transition-colors">
              Full schedule <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <UpcomingSessions sessions={sessions} courseTitles={courseTitles} limit={3} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Enrolled courses */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">My Courses</h2>
            <Link href="/dashboard/courses" className="text-white/40 hover:text-white text-xs flex items-center gap-1 transition-colors">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {enrollments.length === 0 ? (
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-8 text-center">
              <Zap className="w-8 h-8 text-white/20 mx-auto mb-3" />
              <p className="text-white/40 text-sm">No courses enrolled yet</p>
              <Link href="/courses" className="inline-block mt-3 text-[#ffbd59] hover:text-[#f5a623] text-xs font-medium transition-colors">
                Browse courses →
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {enrollments.map((enrollment) => {
                const course = courses.find((c) => c.id === enrollment.course_id);
                const nextAt = nextSessionAt(enrollment, sessions);
                return (
                  <div
                    key={enrollment.id}
                    className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 hover:border-white/[0.15] transition-all group"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-11 h-11 ${course?.bg || "bg-white/10"} rounded-xl flex items-center justify-center flex-shrink-0`}>
                        {course && <CourseIcon icon={course.icon} className={`w-5 h-5 ${course.color}`} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-white font-semibold text-sm">{course?.title || enrollment.course_id}</h3>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                            enrollment.status === "active"
                              ? "bg-green-500/15 text-green-400"
                              : enrollment.status === "completed"
                              ? "bg-blue-500/15 text-blue-400"
                              : "bg-yellow-500/15 text-yellow-400"
                          }`}>
                            {enrollment.status}
                          </span>
                        </div>
                        <p className="text-white/40 text-xs mt-0.5">{course?.duration} · {course?.level}</p>

                        {/* Progress bar */}
                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-white/40 text-xs">Progress</span>
                            <span className="text-white font-medium text-xs">{enrollment.progress || 0}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#c31d24] to-[#e53535] rounded-full transition-all"
                              style={{ width: `${enrollment.progress || 0}%` }}
                            />
                          </div>
                        </div>

                        {/* Next session */}
                        {nextAt && (
                          <div className="mt-3 flex items-center gap-2 text-xs text-white/40">
                            <Calendar className="w-3 h-3 text-[#ffbd59]" />
                            <span>Next session: <LocalTime iso={nextAt} className="text-[#ffbd59]" /></span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Announcements sidebar */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Latest Updates</h2>
            <Link href="/dashboard/announcements" className="text-white/40 hover:text-white text-xs flex items-center gap-1 transition-colors">
              All <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {announcements.length === 0 ? (
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 text-center">
              <Megaphone className="w-6 h-6 text-white/20 mx-auto mb-2" />
              <p className="text-white/40 text-xs">No announcements yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {announcements.map((ann) => (
                <div key={ann.id} className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4 hover:border-white/15 transition-all">
                  <h3 className="text-white text-sm font-medium mb-1">{ann.title}</h3>
                  <p className="text-white/40 text-xs line-clamp-2">{ann.body}</p>
                  <div className="flex items-center gap-1.5 mt-2 text-white/25 text-[10px]">
                    <Clock className="w-3 h-3" />
                    {new Date(ann.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Notes from instructor */}
      {notes.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4 text-[#ffbd59]" />
            <h2 className="text-lg font-semibold text-white">Notes from Your Instructor</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {notes.map((note: { id: string; title: string | null; body: string; updated_at: string }) => (
              <div
                key={note.id}
                className="bg-[#ffbd59]/5 border border-[#ffbd59]/15 rounded-2xl p-5 hover:border-[#ffbd59]/25 transition-all"
              >
                {note.title && (
                  <p className="text-[#ffbd59] text-sm font-semibold mb-2">{note.title}</p>
                )}
                <p className="text-white/60 text-sm leading-relaxed whitespace-pre-wrap">{note.body}</p>
                <p className="text-white/20 text-[10px] mt-3">
                  {new Date(note.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 max-w-md">
        <RedeemCodeCard />
      </div>
    </div>
  );
}
