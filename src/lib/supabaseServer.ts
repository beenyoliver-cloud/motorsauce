import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Server-only Supabase client (no cookie/session persistence) */
export const supabase = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
});
