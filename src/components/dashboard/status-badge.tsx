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
          : "bg-umber-100 text-umber-700 ring-umber-500/20 dark:bg-umber-800 dark:text-umber-300",
      )}
    >
      <span
        aria-hidden
        className={cn("size-1.5 rounded-full", published ? "bg-emerald-500" : "bg-umber-400")}
      />
      {published ? "Published" : "Draft"}
    </span>
  );
}
