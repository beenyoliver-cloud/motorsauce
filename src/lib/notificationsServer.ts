import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

export type CreateNotificationInput = {
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
};

/**
 * Create a notification using the Supabase service role.
 *
 * This is intended for server-side system events (checkout, moderation, etc).
 * It should never throw for a missing notifications table (schema drift);
 * it returns { ok: false } instead.
 */
export async function createNotificationServer(input: CreateNotificationInput): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    if (!supabaseUrl || !serviceRoleKey) {
      return { ok: false, error: "Supabase service role key is not configured" };
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error } = await supabase.from("notifications").insert([
      {
        user_id: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link ?? null,
        read: false,
        created_at: new Date().toISOString(),
      },
    ]);

    if (error) {
      // Don't break checkout if notifications aren't available.
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Unexpected" };
  }
}
