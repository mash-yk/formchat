import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { requireUser } from "@/lib/auth";
import { logout } from "../(auth)/actions";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/dashboard" aria-label="Dashboard home">
            <Logo />
          </Link>
          <Suspense
            fallback={<div className="h-8 w-40 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />}
          >
            <UserMenu />
          </Suspense>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}

async function UserMenu() {
  const user = await requireUser();
  return (
    <div className="flex items-center gap-3">
      <span className="hidden truncate text-sm text-zinc-600 sm:block dark:text-zinc-400">{user.email}</span>
      <form action={logout}>
        <button
          type="submit"
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Log out
        </button>
      </form>
    </div>
  );
}
