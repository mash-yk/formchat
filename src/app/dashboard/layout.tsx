import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { isAdminUser } from "@/lib/admin";
import { requireUser } from "@/lib/auth";
import { logout } from "../(auth)/actions";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grain flex min-h-dvh flex-1 flex-col bg-umber-50 dark:bg-umber-950 dark:bg-[radial-gradient(55%_45%_at_50%_0%,color-mix(in_oklab,var(--color-bronze-600)_22%,transparent),transparent)]">
      <header className="sticky top-0 z-10 border-b border-umber-200 bg-white/80 backdrop-blur dark:border-umber-800 dark:bg-umber-900/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/dashboard" aria-label="Dashboard home">
            <Logo />
          </Link>
          <Suspense
            fallback={<div className="h-8 w-40 animate-pulse rounded-lg bg-umber-100 dark:bg-umber-800" />}
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
  const admin = isAdminUser(user);

  return (
    <div className="flex items-center gap-3">
      {admin && (
        <Link
          href="/admin"
          className="rounded-lg bg-bronze-100 px-2.5 py-1 text-xs font-semibold text-bronze-800 transition hover:bg-bronze-200 dark:bg-bronze-950 dark:text-bronze-300 dark:hover:bg-bronze-900"
        >
          Admin Panel
        </Link>
      )}
      <span className="hidden truncate text-sm text-umber-600 sm:block dark:text-umber-400">
        {user.email}
      </span>
      <form action={logout}>
        <button
          type="submit"
          className="rounded-lg border border-umber-300 px-3 py-1.5 text-sm font-medium transition hover:bg-umber-100 dark:border-umber-700 dark:hover:bg-umber-800"
        >
          Log out
        </button>
      </form>
    </div>
  );
}
