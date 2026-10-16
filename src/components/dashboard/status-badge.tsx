import type { FormStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: FormStatus }) {
  const published = status === "published";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        published
          ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/50 dark:text-emerald-300"
          : "bg-zinc-100 text-zinc-700 ring-zinc-500/20 dark:bg-zinc-800 dark:text-zinc-300",
      )}
    >
      <span
        aria-hidden
        className={cn("size-1.5 rounded-full", published ? "bg-emerald-500" : "bg-zinc-400")}
      />
      {published ? "Published" : "Draft"}
    </span>
  );
}
