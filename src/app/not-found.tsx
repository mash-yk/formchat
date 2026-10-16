import Link from "next/link";
import { buttonClass } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <p className="font-display text-7xl font-bold text-bronze-metal">404</p>
      <h1 className="text-xl font-semibold">This page doesn’t exist</h1>
      <p className="max-w-sm text-sm text-umber-600 dark:text-umber-400">
        The link may be broken, or the form may have been deleted.
      </p>
      <div className="flex gap-2">
        <Link href="/" className={buttonClass("secondary")}>
          Home
        </Link>
        <Link href="/dashboard" className={buttonClass("primary")}>
          Go to dashboard
        </Link>
      </div>
    </main>
  );
}
