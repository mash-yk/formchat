"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { GuardedLink } from "./unsaved-changes";

export function FormTabs({ formId }: { formId: string }) {
  const pathname = usePathname();
  const base = `/dashboard/forms/${formId}`;
  const tabs = [
    { href: base, label: "Build" },
    { href: `${base}/responses`, label: "Responses" },
    { href: `${base}/share`, label: "Share & embed" },
  ];

  return (
    <nav aria-label="Form sections" className="-mb-px flex gap-1 overflow-x-auto">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <GuardedLink
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition",
              active
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
            )}
          >
            {tab.label}
          </GuardedLink>
        );
      })}
    </nav>
  );
}
