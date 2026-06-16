import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase";
import { Clock, Megaphone } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Announcements | Code Illustrated Dashboard",
};

async function getAnnouncements(userId: string) {
  const admin = createAdminClient();
  // Get user's course IDs
  const { data: enrollments } = await admin
    .from("enrollments")
    .select("course_id")
    .eq("user_id", userId);

  const courseIds = (enrollments || []).map((e) => e.course_id);

  // Get announcements that are either global (null) or for the learner's courses
  const { data } = await admin
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false });

  return (data || []).filter(
    (ann) => ann.course_id === null || courseIds.includes(ann.course_id)
  );
}

async function getCurrentUserId() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() {},
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  } catch {
    return null;
  }
}

export default async function AnnouncementsPage() {
  const userId = await getCurrentUserId();
  const announcements = userId ? await getAnnouncements(userId) : [];

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Announcements</h1>
        <p className="text-white/40 text-sm mt-1">Updates and messages from Code Illustrated</p>
      </div>

      {announcements.length === 0 ? (
        <div className="text-center py-16 bg-white/[0.03] border border-white/[0.08] rounded-2xl">
          <Megaphone className="w-12 h-12 text-white/15 mx-auto mb-4" />
          <p className="text-white/40 font-medium">No announcements yet</p>
          <p className="text-white/25 text-sm mt-1">Check back later for updates from your school</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((ann, i) => (
            <article
              key={ann.id}
              className={`bg-white/[0.04] border rounded-2xl p-6 transition-all hover:border-white/[0.15] ${
                i === 0 ? "border-[#c31d24]/30 bg-[#c31d24]/[0.04]" : "border-white/[0.08]"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  i === 0 ? "bg-[#c31d24]/20" : "bg-white/[0.06]"
                }`}>
                  <Megaphone className={`w-4 h-4 ${i === 0 ? "text-[#c31d24]" : "text-white/40"}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h2 className="text-white font-semibold">{ann.title}</h2>
                    {i === 0 && (
                      <span className="text-[10px] bg-[#c31d24]/20 text-[#c31d24] border border-[#c31d24]/30 px-2 py-0.5 rounded-full font-medium">
                        Latest
                      </span>
                    )}
                    {ann.course_id && (
                      <span className="text-[10px] bg-[#1a596c]/20 text-[#3da3bc] border border-[#1a596c]/30 px-2 py-0.5 rounded-full font-medium">
                        Course Update
                      </span>
                    )}
                  </div>
                  <p className="text-white/60 text-sm leading-relaxed">{ann.body}</p>
                  <div className="flex items-center gap-1.5 mt-3 text-white/25 text-xs">
                    <Clock className="w-3 h-3" />
                    {new Date(ann.created_at).toLocaleDateString("en-GB", {
                      weekday: "long", day: "numeric", month: "long", year: "numeric",
                    })}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
