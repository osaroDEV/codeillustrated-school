// Dummy Supabase env vars so lib/supabase.ts's top-level createBrowserClient()
// call doesn't throw when the module is imported during tests.
process.env.NEXT_PUBLIC_SUPABASE_URL ||= "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= "test-anon-key";
