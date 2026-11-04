import { createClient } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Browser client — cookie-based session so middleware can read it
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

// Server-side admin client — uses service role key, bypasses RLS
// Only call this from API routes / server components, NEVER expose to client
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          role: "student" | "instructor" | "admin";
          email: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          email?: string | null;
        };
        Update: {
          full_name?: string | null;
          avatar_url?: string | null;
        };
      };
      invite_codes: {
        Row: {
          id: string;
          code: string;
          course_id: string;
          used_by: string | null;
          used_at: string | null;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          code: string;
          course_id: string;
          expires_at?: string | null;
        };
        Update: {
          used_by?: string | null;
          used_at?: string | null;
        };
      };
      enrollments: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          progress: number;
          status: "active" | "completed" | "paused";
          enrolled_at: string;
          next_session: string | null;
          notes: string | null;
          cohort_id: string | null;
        };
        Insert: {
          user_id: string;
          course_id: string;
          progress?: number;
          status?: "active" | "completed" | "paused";
          next_session?: string | null;
          notes?: string | null;
        };
        Update: {
          progress?: number;
          status?: "active" | "completed" | "paused";
          next_session?: string | null;
          notes?: string | null;
        };
      };
      announcements: {
        Row: {
          id: string;
          title: string;
          body: string;
          course_id: string | null;
          created_at: string;
        };
        Insert: {
          title: string;
          body: string;
          course_id?: string | null;
        };
        Update: {
          title?: string;
          body?: string;
          course_id?: string | null;
        };
      };
    };
  };
};
