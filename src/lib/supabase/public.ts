import "server-only";
import { createClient } from "@supabase/supabase-js";
import { connection } from "next/server";

/**
 * Supabase client WITHOUT a user session — for public pages (/f, /embed) and
 * public API routes. It runs as the `anon` role, so Row Level Security only
 * lets it read published forms.
 */
export async function createPublicClient() {
  await connection();
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );
}
