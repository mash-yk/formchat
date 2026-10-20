import { ArrowLeft, Shield } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { requireAdmin } from "@/lib/admin";
import { logout } from "../(auth)/actions";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grain flex min-h-dvh flex-1 flex-col bg-umber-50 dark:bg-umber-950 dark:bg-[radial-gradient(55%_45%_at_50%_0%,color-mix(in_oklab,var(--color-bronze-600)_22%,transparent),transparent)]">
      <header className="sticky top-0 z-10 border-b border-umber-200 bg-white/80 backdrop-blur dark:border-umber-800 dark:bg-umber-900/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" aria-label="Dashboard home">
              <Logo />
            </Link>
            <span className="inline-flex items-center gap-1 rounded-md bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-900 dark:bg-purple-950 dark:text-purple-300">
              <Shield className="size-3" /> Admin Portal
            </span>
          </div>

          <Suspense
            fallback={<div className="h-8 w-40 animate-pulse rounded-lg bg-umber-100 dark:bg-umber-800" />}
          >
            <AdminMenu />
          </Suspense>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}

async function AdminMenu() {
  const admin = await requireAdmin();

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-xs font-medium text-umber-600 hover:text-umber-900 dark:text-umber-400 dark:hover:text-umber-100"
      >
        <ArrowLeft className="size-3.5" /> Back to Dashboard
      </Link>
      <span className="hidden truncate text-xs text-umber-500 sm:block">{admin.email}</span>
      <form action={logout}>
        <button
          type="submit"
          className="rounded-lg border border-umber-300 px-2.5 py-1 text-xs font-medium transition hover:bg-umber-100 dark:border-umber-700 dark:hover:bg-umber-800"
        >
          Log out
        </button>
      </form>
    </div>
  );
}
