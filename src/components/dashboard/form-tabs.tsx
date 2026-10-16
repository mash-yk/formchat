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
                ? "border-bronze-600 text-bronze-600 dark:border-bronze-400 dark:text-bronze-400"
                : "border-transparent text-umber-600 hover:border-umber-300 hover:text-umber-900 dark:text-umber-400 dark:hover:text-umber-100",
            )}
          >
            {tab.label}
          </GuardedLink>
        );
      })}
    </nav>
  );
}
