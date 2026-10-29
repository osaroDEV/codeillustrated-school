import type { User } from "@supabase/supabase-js";
import type { createAdminClient } from "./supabase";

type AdminClient = ReturnType<typeof createAdminClient>;

// auth.admin.listUsers is paginated (max 1000 per page); walk every page.
export async function listAllAuthUsers(admin: AdminClient): Promise<User[]> {
  const users: User[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 1000) return users;
  }
}
