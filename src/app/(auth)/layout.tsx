import Link from "next/link";
import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grain flex min-h-dvh flex-1 flex-col items-center justify-center bg-umber-50 px-4 py-12 dark:bg-umber-950 dark:bg-[radial-gradient(50%_45%_at_50%_45%,color-mix(in_oklab,var(--color-bronze-600)_22%,transparent),transparent)]">
      <Link href="/" className="mb-8" aria-label="Formchat home">
        <Logo />
      </Link>
      <div className="w-full max-w-sm rounded-2xl border border-umber-200 bg-white p-6 shadow-sm sm:p-8 dark:border-bronze-300/15 dark:bg-umber-900/80 dark:shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] dark:backdrop-blur">
        {children}
      </div>
    </main>
  );
}
