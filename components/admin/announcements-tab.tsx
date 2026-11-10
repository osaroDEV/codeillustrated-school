"use client";

import { useState, useEffect, useCallback } from "react";
import type { CourseSummary } from "@/lib/courses";
import { Trash2, Loader2, RefreshCw, Send } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  body: string;
  course_id: string | null;
  created_at: string;
}

export function AnnouncementsTab({ courses }: { courses: CourseSummary[] }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);
  const [annTitle, setAnnTitle] = useState("");
  const [annBody, setAnnBody] = useState("");
  const [annCourseId, setAnnCourseId] = useState("");
  const [postingAnn, setPostingAnn] = useState(false);
  const [annError, setAnnError] = useState("");

  const fetchAnnouncements = useCallback(async () => {
    setLoadingAnnouncements(true);
    const res = await fetch("/api/admin/announcements");
    if (res.ok) setAnnouncements(await res.json());
    setLoadingAnnouncements(false);
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  async function postAnnouncement() {
    if (!annTitle || !annBody) return;
    setPostingAnn(true);
    setAnnError("");
    const res = await fetch("/api/admin/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: annTitle, body: annBody, course_id: annCourseId || null }),
    });
    if (res.ok) {
      setAnnTitle("");
      setAnnBody("");
      setAnnCourseId("");
      fetchAnnouncements();
    } else {
      const d = await res.json().catch(() => ({}));
      setAnnError(d.error || "Failed to post announcement.");
    }
    setPostingAnn(false);
  }

  async function deleteAnnouncement(id: string) {
    await fetch("/api/admin/announcements", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div>
      {/* Post form */}
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 mb-6">
        <h2 className="text-white font-semibold mb-5 flex items-center gap-2">
          <Send className="w-4 h-4 text-[#ffbd59]" /> Post Announcement
        </h2>
        <p className="text-white/35 text-xs -mt-3 mb-4">Also emailed to those learners, unless they&apos;ve turned course emails off.</p>
        <div className="space-y-4">
          <div>
            <label className="block text-white/50 text-xs mb-2 uppercase tracking-wider">Title</label>
            <input
              id="announcement-title"
              type="text"
              value={annTitle}
              onChange={(e) => setAnnTitle(e.target.value)}
              placeholder="e.g. New resources added for Frontend learners"
              className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm focus:outline-none focus:border-[#ffbd59]/50 transition-all"
            />
          </div>
          <div>
            <label className="block text-white/50 text-xs mb-2 uppercase tracking-wider">Message</label>
            <textarea
              id="announcement-body"
              value={annBody}
              onChange={(e) => setAnnBody(e.target.value)}
              rows={3}
              placeholder="Write your announcement here..."
              className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm focus:outline-none focus:border-[#ffbd59]/50 transition-all resize-none"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-white/50 text-xs mb-2 uppercase tracking-wider">Target audience</label>
              <select
                id="announcement-course"
                value={annCourseId}
                onChange={(e) => setAnnCourseId(e.target.value)}
                className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#ffbd59]/50 transition-all"
              >
                <option value="" className="bg-[#0d0d14]">All learners (global)</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#0d0d14]">{c.title} only</option>
                ))}
              </select>
            </div>
            <div className="sm:self-end">
              <button
                id="post-announcement-btn"
                onClick={postAnnouncement}
                disabled={postingAnn || !annTitle || !annBody}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-[#ffbd59] to-[#f5a623] hover:from-[#f5a623] hover:to-[#d9890a] text-black font-semibold px-6 py-3 rounded-xl transition-all shadow-lg shadow-[#ffbd59]/20 disabled:opacity-60 whitespace-nowrap"
              >
                {postingAnn ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Post
              </button>
            </div>
          </div>
        </div>
      </div>

      {annError && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {annError}
        </div>
      )}

      {/* Announcements list */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-semibold">Posted Announcements</h2>
        <button onClick={fetchAnnouncements} className="text-white/40 hover:text-white transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {loadingAnnouncements ? (
        <div className="flex items-center justify-center py-12 text-white/30">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...
        </div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-12 text-white/30 text-sm border border-white/[0.08] rounded-2xl">
          No announcements posted yet
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((ann) => {
            const course = courses.find((c) => c.id === ann.course_id);
            return (
              <div key={ann.id} className="flex items-start gap-4 p-5 bg-white/[0.04] border border-white/[0.08] rounded-2xl hover:border-white/[0.12] transition-all">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="text-white font-semibold text-sm">{ann.title}</h3>
                    <span className="text-[10px] bg-white/[0.06] text-white/40 px-2 py-0.5 rounded-full">
                      {course ? course.title : "All Learners"}
                    </span>
                  </div>
                  <p className="text-white/50 text-sm">{ann.body}</p>
                  <p className="text-white/25 text-xs mt-2">
                    {new Date(ann.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
                <button
                  onClick={() => deleteAnnouncement(ann.id)}
                  className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400/50 hover:text-red-400 transition-all flex-shrink-0"
                  title="Delete announcement"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
