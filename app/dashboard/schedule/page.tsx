import type { Metadata } from "next";
import { CalendarDays, History } from "lucide-react";
import { requireUser } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase";
import { getCourses } from "@/lib/courses";
import { getLearnerSessions, type LearnerSession } from "@/lib/cohorts";
import { PastSessions, UpcomingSessions } from "@/components/schedule/session-list";

export const metadata: Metadata = {
  title: "Schedule | Code Illustrated Dashboard",
};

const JOIN_MESSAGES: Record<string, string> = {
  early: "That class hasn't opened yet. The Join button appears 15 minutes before it starts.",
  ended: "That class has already finished. Its recording will appear under Past classes once it's uploaded.",
  no_link: "That class doesn't have a meeting link yet. Please check back shortly or contact your instructor.",
  not_found: "We couldn't find that class in your schedule.",
  payment: "Your subscription for this course has lapsed. Renew it from Billing to join classes again.",
};

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ join?: string }>;
}) {
  const user = await requireUser();
  const { join } = await searchParams;

  let sessions: LearnerSession[] = [];
  let loadError = false;
  try {
    sessions = await getLearnerSessions(createAdminClient(), user.id);
  } catch (err) {
    console.error("Schedule load failed:", err);
    loadError = true;
  }
  const courses = await getCourses();
  const courseTitles = Object.fromEntries(courses.map((c) => [c.id, c.title]));

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Schedule</h1>
        <p className="text-white/40 text-sm mt-1">Your live classes, recordings and attendance</p>
      </div>

      {join && JOIN_MESSAGES[join] && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-[#ffbd59]/10 border border-[#ffbd59]/30 text-[#ffbd59] text-sm">
          {JOIN_MESSAGES[join]}
        </div>
      )}
      {loadError && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          We couldn&apos;t load your schedule. Please refresh the page.
        </div>
      )}

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-[#ffbd59]" /> Upcoming classes
        </h2>
        <UpcomingSessions sessions={sessions} courseTitles={courseTitles} />
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <History className="w-4 h-4 text-[#3da3bc]" /> Past classes
        </h2>
        <PastSessions sessions={sessions} courseTitles={courseTitles} />
      </section>
    </div>
  );
}
