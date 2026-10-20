"use client";

import {
  ArrowUpDown,
  FileText,
  Search,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { createFormFromTemplate } from "@/app/dashboard/actions";
import { FORM_TEMPLATES } from "@/lib/templates";
import type { FormListItem } from "@/lib/forms";
import { cn, pluralize } from "@/lib/utils";
import { buttonClass } from "../ui/button";
import { CustomSelect } from "../ui/custom-select";
import { LocalTime } from "../ui/local-time";
import { DeleteFormButton } from "./delete-form-button";
import { DuplicateFormButton } from "./duplicate-form-button";
import { PublishButton } from "./publish-button";
import { StatusBadge } from "./status-badge";

type SortOption = "updated_desc" | "updated_asc" | "responses_desc" | "title_asc";

export function DashboardFormsList({ forms }: { forms: FormListItem[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [sortBy, setSortBy] = useState<SortOption>("updated_desc");
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [templatePending, setTemplatePending] = useState(false);

  const filtered = useMemo(() => {
    let result = forms;

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter((f) => f.title.toLowerCase().includes(q));
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((f) => f.status === statusFilter);
    }

    // Sorting
    return [...result].sort((a, b) => {
      switch (sortBy) {
        case "updated_asc":
          return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
        case "responses_desc":
          return b.responseCount - a.responseCount;
        case "title_asc":
          return a.title.localeCompare(b.title);
        case "updated_desc":
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });
  }, [forms, search, statusFilter, sortBy]);

  async function handleSelectTemplate(tplId: string) {
    try {
      setTemplatePending(true);
      await createFormFromTemplate(tplId);
    } catch {
      setTemplatePending(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Controls Bar: Search, Status Filter, Sort */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative min-w-0 flex-1 max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-umber-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search forms by title…"
              className="w-full rounded-xl border border-umber-200 bg-white py-2 pl-9 pr-8 text-xs text-umber-900 outline-none transition placeholder:text-umber-400 focus:border-bronze-500 focus:ring-2 focus:ring-bronze-500/20 dark:border-umber-800 dark:bg-umber-900 dark:text-umber-100"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-umber-400 hover:text-umber-700"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="inline-flex rounded-lg border border-umber-200 bg-white p-0.5 text-xs font-medium dark:border-umber-800 dark:bg-umber-900">
            {(["all", "published", "draft"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "rounded-md px-2.5 py-1 capitalize transition",
                  statusFilter === s
                    ? "bg-bronze-600 text-white dark:bg-bronze-500"
                    : "text-umber-600 hover:text-umber-900 dark:text-umber-400",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 text-xs text-umber-500">
            <ArrowUpDown className="size-3.5" />
            <CustomSelect
              value={sortBy}
              onChange={(val) => setSortBy(val as SortOption)}
              options={[
                { value: "updated_desc", label: "Recently updated" },
                { value: "updated_asc", label: "Oldest first" },
                { value: "responses_desc", label: "Most responses" },
                { value: "title_asc", label: "Title A-Z" },
              ]}
              size="sm"
              className="w-40"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowTemplatesModal(true)}
            className={buttonClass("secondary", "sm")}
          >
            <FileText className="size-3.5" /> Templates
          </button>
        </div>
      </div>

      {/* Forms List */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-umber-300 bg-white p-12 text-center dark:border-umber-800 dark:bg-umber-900">
          <p className="font-medium text-umber-800 dark:text-umber-200">No forms found</p>
          <p className="mt-1 text-xs text-umber-500">
            {search || statusFilter !== "all"
              ? "Try adjusting your search query or status filter."
              : "Create your first conversational form or pick a template."}
          </p>
          {(search || statusFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
              }}
              className={buttonClass("secondary", "sm", "mt-4")}
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-umber-200 overflow-hidden rounded-xl border border-umber-200 bg-white dark:divide-umber-800 dark:border-umber-800 dark:bg-umber-900">
          {filtered.map((form) => {
            const base = `/dashboard/forms/${form.id}`;
            return (
              <li
                key={form.id}
                className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 hover:bg-umber-50/50 dark:hover:bg-umber-950/40 transition"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={base}
                      className="truncate font-semibold text-umber-900 hover:text-bronze-600 hover:underline dark:text-umber-100 dark:hover:text-bronze-400"
                    >
                      {form.title}
                    </Link>
                    <StatusBadge status={form.status} />
                  </div>
                  <p className="text-xs text-umber-400">
                    {pluralize(form.questionCount, "question")} ·{" "}
                    <Link href={`${base}/responses`} className="hover:underline font-medium text-umber-600 dark:text-umber-300">
                      {pluralize(form.responseCount, "response")}
                    </Link>{" "}
                    · Updated <LocalTime iso={form.updated_at} style="relative" />
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <Link href={base} className={buttonClass("secondary", "sm")}>
                    Edit
                  </Link>
                  <Link href={`${base}/responses`} className={buttonClass("secondary", "sm")}>
                    Responses
                  </Link>
                  <Link href={`${base}/analytics`} className={buttonClass("secondary", "sm")}>
                    Analytics
                  </Link>
                  <Link href={`${base}/share`} className={buttonClass("secondary", "sm")}>
                    Share
                  </Link>
                  <DuplicateFormButton formId={form.id} />
                  <PublishButton formId={form.id} status={form.status} />
                  <DeleteFormButton
                    formId={form.id}
                    title={form.title}
                    responseCount={form.responseCount}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Templates Modal */}
      {showTemplatesModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Create from template"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-2xl rounded-2xl border border-umber-200 bg-white p-6 shadow-2xl dark:border-umber-800 dark:bg-umber-900">
            <div className="flex items-center justify-between border-b border-umber-100 pb-3 dark:border-umber-800">
              <div>
                <h2 className="text-lg font-semibold">Start with a Reusable Template</h2>
                <p className="text-xs text-umber-500">
                  Choose a pre-configured template with questions, ratings, and conditional logic.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTemplatesModal(false)}
                className="grid size-8 place-items-center rounded-lg hover:bg-umber-100 dark:hover:bg-umber-800"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4 max-h-[60vh] space-y-3 overflow-y-auto pr-1">
              {FORM_TEMPLATES.map((tpl) => (
                <div
                  key={tpl.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-umber-200 p-4 transition hover:border-bronze-400 hover:bg-umber-50/50 dark:border-umber-800 dark:hover:bg-umber-950/40"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-bronze-100 px-2 py-0.5 text-[10px] font-semibold text-bronze-800 dark:bg-bronze-950 dark:text-bronze-300">
                        {tpl.category}
                      </span>
                      <h3 className="text-sm font-semibold">{tpl.name}</h3>
                    </div>
                    <p className="text-xs text-umber-600 dark:text-umber-400">{tpl.description}</p>
                  </div>
                  <button
                    type="button"
                    disabled={templatePending}
                    onClick={() => handleSelectTemplate(tpl.id)}
                    className={buttonClass("primary", "sm", "shrink-0")}
                  >
                    {templatePending ? "Creating…" : "Use template"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
