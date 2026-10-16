"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type AuthState = {
  error?: string;
  message?: string;
  fieldErrors?: { email?: string[]; password?: string[] };
  email?: string;
};

const credentialsSchema = z.object({
  email: z.email("Enter a valid email address").trim().toLowerCase(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters"),
});

/** Only allow same-site relative paths, to prevent open redirects. */
function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

function parse(formData: FormData) {
  return credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = parse(formData);
  const email = String(formData.get("email") ?? "");
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, email };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return {
      error:
        error.code === "email_not_confirmed"
          ? "Please confirm your email first — check your inbox."
          : "Incorrect email or password.",
      email,
    };
  }

  redirect(safeNext(formData.get("next")));
}

export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = parse(formData);
  const email = String(formData.get("email") ?? "");
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, email };
  }

  // Prefer the canonical public URL: Vercel deployment URLs sit behind Vercel's own login.
  const origin = process.env.NEXT_PUBLIC_SITE_URL || (await headers()).get("origin") || "";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: `${origin}/auth/confirm?next=/dashboard` },
  });

  if (error) {
    return {
      error:
        error.code === "user_already_exists"
          ? "An account with this email already exists. Try logging in."
          : error.message,
      email,
    };
  }

  // Email confirmation disabled in Supabase → we already have a session.
  if (data.session) redirect("/dashboard");

  return { message: `We sent a confirmation link to ${parsed.data.email}.`, email };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
