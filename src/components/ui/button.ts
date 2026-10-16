import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "danger-ghost";
type Size = "sm" | "md";

const base =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-medium transition " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze-400 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

const variants: Record<Variant, string> = {
  primary:
    "bg-bronze-metal font-semibold text-umber-950 shadow-[0_8px_24px_-10px_var(--color-bronze-400)] hover:brightness-110",
  secondary:
    "border border-umber-300 bg-white text-umber-900 shadow-xs hover:bg-umber-50 " +
    "dark:border-umber-700 dark:bg-umber-900 dark:text-umber-100 dark:hover:bg-umber-800",
  ghost: "text-umber-700 hover:bg-umber-100 dark:text-umber-300 dark:hover:bg-umber-800",
  danger: "bg-red-600 text-white shadow-sm hover:bg-red-500",
  "danger-ghost": "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
};

/** Tailwind classes for buttons and button-styled links. */
export function buttonClass(variant: Variant = "secondary", size: Size = "md", extra?: string) {
  return cn(base, variants[variant], sizes[size], extra);
}

export const inputClass =
  "block w-full rounded-lg border border-umber-300 bg-white px-3 py-2 text-sm text-umber-900 shadow-xs outline-none transition " +
  "placeholder:text-umber-400 focus:border-bronze-400 focus:ring-2 focus:ring-bronze-400/25 " +
  "aria-invalid:border-red-500 aria-invalid:focus:ring-red-500/20 " +
  "dark:border-umber-700 dark:bg-umber-950 dark:text-umber-100";
