import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = { id: string; email: string };

/**
 * Returns the signed-in user or redirects to /login.
 * Call this at the top of every protected page, Server Action and Route Handler —
 * the proxy redirect alone is not a security boundary.
 */
export async function requireUser(): Promise<CurrentUser> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) redirect("/login");

  return { id: data.claims.sub, email: (data.claims.email as string) ?? "" };
}
