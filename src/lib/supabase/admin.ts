import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client with the SECRET key. It bypasses Row Level Security, so:
 *  - only import it from server code (the `server-only` import enforces this),
 *  - only use it for the one thing that needs it: inserting a response AFTER
 *    the submit API has validated it.
 */
export function createAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      "SUPABASE_SECRET_KEY is not set. Add it to .env.local (Supabase → Project Settings → API Keys → Secret keys).",
    );
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
