import type { Metadata } from "next";
import { requireAdmin } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase";
import { MessagesPanel, type ContactMessage } from "@/components/admin/messages-panel";

export const metadata: Metadata = { title: "Messages | Admin" };

export default async function MessagesPage() {
  await requireAdmin();
  const { data, error } = await createAdminClient()
    .from("contact_messages")
    .select("id, name, email, phone, course, message, status, email_sent, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  return <MessagesPanel messages={(data ?? []) as ContactMessage[]} loadError={error?.message ?? null} />;
}
