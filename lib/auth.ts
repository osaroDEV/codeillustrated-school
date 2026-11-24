import { supabase } from "./supabase";

// Convention throughout this file: Supabase errors are swallowed and mapped
// to null (or []), not thrown — callers can't distinguish "not found" from
// a real fetch failure, so treat any falsy/empty return as "unavailable".

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

/** `captchaToken` is required once CAPTCHA protection is on in Supabase (see lib/turnstile.ts). */
export async function signIn(email: string, password: string, captchaToken?: string) {
  return supabase.auth.signInWithPassword({ email, password, options: { captchaToken } });
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
    // Course-scoped announcements always include global ones (course_id IS NULL).
    query = query.or(`course_id.eq.${courseId},course_id.is.null`);
  }

  const { data, error } = await query;
  if (error) return [];
  return data;
}
