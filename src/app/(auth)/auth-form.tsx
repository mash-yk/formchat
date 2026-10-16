"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { buttonClass } from "@/components/ui/button";
import { login, signup, type AuthState } from "./actions";

type Mode = "login" | "signup";

const copy = {
  login: {
    title: "Welcome back",
    subtitle: "Log in to manage your forms.",
    submit: "Log in",
    pending: "Logging in…",
    switchText: "New here?",
    switchLink: { href: "/signup", label: "Create an account" },
  },
  signup: {
    title: "Create your account",
    subtitle: "Build chat-style forms in minutes.",
    submit: "Create account",
    pending: "Creating account…",
    switchText: "Already have an account?",
    switchLink: { href: "/login", label: "Log in" },
  },
} as const;

export function AuthForm({ mode }: { mode: Mode }) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    mode === "login" ? login : signup,
    {},
  );
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const urlError = searchParams.get("error");
  const t = copy[mode];

  if (state.message) {
    return (
      <div className="space-y-3 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Check your email</h1>
        <p className="text-sm text-umber-600 dark:text-umber-400">{state.message}</p>
        <p className="text-sm text-umber-600 dark:text-umber-400">
          Click the link in the email to finish signing up.
        </p>
      </div>
    );
  }

  const error = state.error ?? (urlError ? "That link is invalid or has expired." : null);

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
        <p className="text-sm text-umber-600 dark:text-umber-400">{t.subtitle}</p>
      </div>

      <form action={formAction} className="space-y-4" noValidate>
        <input type="hidden" name="next" value={next} />

        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={state.email}
          errors={state.fieldErrors?.email}
        />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          hint={mode === "signup" ? "At least 8 characters." : undefined}
          errors={state.fieldErrors?.password}
        />

        {error && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300"
          >
            {error}
          </p>
        )}

        <button type="submit" disabled={pending} className={buttonClass("primary", "md", "w-full")}>
          {pending ? t.pending : t.submit}
        </button>
      </form>

      <p className="text-center text-sm text-umber-600 dark:text-umber-400">
        {t.switchText}{" "}
        <Link
          href={t.switchLink.href}
          className="font-medium text-bronze-400 hover:text-bronze-300 hover:underline"
        >
          {t.switchLink.label}
        </Link>
      </p>
    </div>
  );
}

function Field({
  label,
  name,
  errors,
  hint,
  ...input
}: {
  label: string;
  name: string;
  errors?: string[];
  hint?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const describedBy = errors?.length ? `${name}-error` : hint ? `${name}-hint` : undefined;
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={name}
        name={name}
        required
        aria-invalid={Boolean(errors?.length)}
        aria-describedby={describedBy}
        className="block w-full rounded-lg border border-umber-300 bg-white px-3 py-2 text-sm shadow-xs outline-none transition focus:border-bronze-500 focus:ring-2 focus:ring-bronze-500/20 aria-invalid:border-red-500 dark:border-umber-700 dark:bg-umber-900"
        {...input}
      />
      {errors?.length ? (
        <p id={`${name}-error`} className="text-sm text-red-600">
          {errors[0]}
        </p>
      ) : hint ? (
        <p id={`${name}-hint`} className="text-xs text-umber-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
