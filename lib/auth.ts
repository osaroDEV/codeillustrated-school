import { supabase } from "./supabase";

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session;
}

export async function getUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUp(email: string, password: string) {
  return supabase.auth.signUp({ email, password });
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) return null;
  return data;
}

export async function getEnrollments(userId: string) {
  const { data, error } = await supabase
    .from("enrollments")
    .select("*")
    .eq("user_id", userId);
  if (error) return [];
  return data;
}

export async function getAnnouncements(courseId?: string) {
  let query = supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false });

  if (courseId) {
    query = query.or(`course_id.eq.${courseId},course_id.is.null`);
  }

  const { data, error } = await query;
  if (error) return [];
  return data;
}
