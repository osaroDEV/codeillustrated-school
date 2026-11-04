"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock, PlayCircle, Video, XCircle } from "lucide-react";
import { LocalTime } from "@/components/local-time";
import { joinState, JOIN_OPENS_BEFORE_MIN } from "@/lib/schedule";
import type { LearnerSession } from "@/lib/cohorts";

const ATTENDANCE_LABEL = {
  present: { text: "Attended", className: "text-green-400", Icon: CheckCircle2 },
  late: { text: "Attended (late)", className: "text-[#ffbd59]", Icon: Clock },
  absent: { text: "Missed", className: "text-red-400", Icon: XCircle },
} as const;

/** Re-renders every 30 s so Join buttons open and close on time. */
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export function UpcomingSessions({
  sessions,
  courseTitles,
  limit,
}: {
  sessions: LearnerSession[];
  courseTitles: Record<string, string>;
  limit?: number;
}) {
  const now = useNow();
  const upcoming = sessions.filter((s) => joinState(s, now) !== "ended").slice(0, limit);

  if (upcoming.length === 0) {
    return (
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 text-center text-white/40 text-sm">
        No upcoming classes scheduled.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {upcoming.map((s) => {
        const state = joinState(s, now);
        return (
          <div
            key={s.id}
            className="flex items-center gap-4 p-4 bg-white/[0.04] border border-white/[0.08] rounded-2xl"
          >
            <div className="w-10 h-10 rounded-xl bg-[#1a596c]/20 flex items-center justify-center flex-shrink-0">
              <Video className="w-4 h-4 text-[#3da3bc]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">
                {s.title || courseTitles[s.course_id] || "Live class"}
              </p>
              <p className="text-white/40 text-xs truncate">
                <LocalTime iso={s.starts_at} className="text-[#ffbd59]" /> · {s.duration_min} min · {s.cohort_name}
              </p>
            </div>
            {state === "open" && s.has_meeting_link ? (
              <a
                href={`/academy/api/sessions/${s.id}/join`}
                target="_blank"
                rel="noopener"
                className="flex-shrink-0 bg-[#c31d24] hover:bg-[#b01a20] text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
              >
                Join now
              </a>
            ) : (
              <span
                className="flex-shrink-0 text-white/30 text-xs border border-white/10 px-3 py-2 rounded-xl"
                title={`The Join button appears ${JOIN_OPENS_BEFORE_MIN} minutes before class`}
              >
                {state === "open" ? "Link coming soon" : `Opens ${JOIN_OPENS_BEFORE_MIN} min before`}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function PastSessions({
  sessions,
  courseTitles,
}: {
  sessions: LearnerSession[];
  courseTitles: Record<string, string>;
}) {
  const now = useNow();
  const past = sessions.filter((s) => joinState(s, now) === "ended").reverse();

  if (past.length === 0) {
    return (
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 text-center text-white/40 text-sm">
        Past classes and their recordings will appear here.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {past.map((s) => {
        const mark = s.attendance ? ATTENDANCE_LABEL[s.attendance] : null;
        return (
          <div
            key={s.id}
            className="flex items-center gap-4 px-4 py-3 bg-white/[0.02] border border-white/[0.06] rounded-xl"
          >
            <div className="flex-1 min-w-0">
              <p className="text-white/80 text-sm truncate">
                {s.title || courseTitles[s.course_id] || "Live class"}
              </p>
              <p className="text-white/30 text-xs">
                <LocalTime iso={s.starts_at} /> · {s.cohort_name}
              </p>
            </div>
            {mark && (
              <span className={`hidden sm:flex items-center gap-1 text-xs ${mark.className}`}>
                <mark.Icon className="w-3.5 h-3.5" /> {mark.text}
              </span>
            )}
            {s.recording_url ? (
              <a
                href={s.recording_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[#3da3bc] hover:text-white text-xs font-medium flex-shrink-0"
              >
                <PlayCircle className="w-4 h-4" /> Recording
              </a>
            ) : (
              <span className="text-white/20 text-xs flex-shrink-0">No recording</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
