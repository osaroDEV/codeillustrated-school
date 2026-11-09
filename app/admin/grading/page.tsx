import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase";
import { requireStaff } from "@/lib/supabase-server";
import { listSubmissions, type SubmissionRow } from "@/lib/assessments-server";
import { GradingPanel } from "@/components/admin/grading-panel";

export const metadata: Metadata = { title: "Grading | Admin" };

export default async function GradingPage() {
  const staff = await requireStaff();
  let submissions: SubmissionRow[] = [];
  let loadError: string | null = null;
  try {
    submissions = await listSubmissions(createAdminClient(), staff);
  } catch (err) {
    loadError = (err as Error).message ?? "Failed to load submissions.";
  }
  return <GradingPanel submissions={submissions} loadError={loadError} />;
}
