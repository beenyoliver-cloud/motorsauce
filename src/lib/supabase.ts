import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseService =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || null;

export const supabaseBrowser = () => createClient(supabaseUrl, supabaseAnon);

type ServerOptions = {
  authHeader?: string | null;
  useServiceRole?: boolean;
};

export const supabaseServer = (options: ServerOptions = {}) => {
  const { authHeader, useServiceRole = false } = options;
  const key = useServiceRole ? supabaseService : supabaseAnon;
  if (!key) {
    throw new Error("Supabase credentials are not configured");
  }

  const global = authHeader
    ? {
        headers: {
          Authorization: authHeader,
        },
      }
    : undefined;

  return createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    ...(global ? { global } : {}),
  });
};
