import { Download, Globe, Link2, Paperclip, Search, Star } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DeleteResponseButton } from "@/components/dashboard/delete-response-button";
import { buttonClass } from "@/components/ui/button";
import { LocalTime } from "@/components/ui/local-time";
import { getOwnedForm } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import type { FormResponse } from "@/lib/types";
import { cn, pluralize } from "@/lib/utils";
import { formatAnswer } from "@/lib/validation";

export const metadata: Metadata = { title: "Responses" };

const PAGE_SIZE = 20;

export default function ResponsesPage({
  params,
  searchParams,
}: PageProps<"/dashboard/forms/[id]/responses">) {
  return (
    <Suspense fallback={<ResponsesSkeleton />}>
      <Responses params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Responses({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const form = await getOwnedForm(id);
  if (!form) notFound();

  const searchQuery = typeof query.q === "string" ? query.q.trim().toLowerCase() : "";
  const sourceFilter = typeof query.source === "string" ? query.source : "all";

  const supabase = await createClient();
  let dbQuery = supabase
    .from("responses")
    .select("id, form_id, answers, source, submitted_at", { count: "exact" })
    .eq("form_id", form.id)
    .order("submitted_at", { ascending: false });

  if (sourceFilter === "link" || sourceFilter === "embed") {
    dbQuery = dbQuery.eq("source", sourceFilter);
  }

  const { data, count, error } = await dbQuery.returns<FormResponse[]>();

  if (error) throw new Error(`Could not load responses: ${error.message}`);
  let allResponses = data ?? [];

  // Filter in-memory if search query is provided
  if (searchQuery) {
    allResponses = allResponses.filter((r) =>
      r.answers.some(
        (a) =>
          a.label.toLowerCase().includes(searchQuery) ||
          a.value.toLowerCase().includes(searchQuery),
      ),
    );
  }

  const total = allResponses.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(query.page) || 1), pageCount);
  const from = (page - 1) * PAGE_SIZE;
  const pagedResponses = allResponses.slice(from, from + PAGE_SIZE);

  if (form.responseCount === 0) {
    return (
      <div className="rounded-xl border border-dashed border-umber-300 bg-white px-6 py-16 text-center dark:border-umber-700 dark:bg-umber-900">
        <p className="font-medium">No responses yet</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-umber-600 dark:text-umber-400">
          {form.status === "published"
            ? "Share the link or embed the widget on your website — responses will show up here."
            : "Publish the form, then share the link or embed the widget to start collecting responses."}
        </p>
        <Link href={`/dashboard/forms/${form.id}/share`} className={buttonClass("primary", "md", "mt-6")}>
          Share &amp; embed
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2">
          {/* Search form */}
          <form method="GET" className="relative min-w-0 flex-1 max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-umber-400" />
            <input
              type="text"
              name="q"
              defaultValue={searchQuery}
              placeholder="Search answers…"
              className="w-full rounded-xl border border-umber-200 bg-white py-2 pl-9 pr-8 text-xs text-umber-900 outline-none transition placeholder:text-umber-400 focus:border-bronze-500 focus:ring-2 focus:ring-bronze-500/20 dark:border-umber-800 dark:bg-umber-900 dark:text-umber-100"
            />
            {sourceFilter !== "all" && <input type="hidden" name="source" value={sourceFilter} />}
          </form>

          {/* Source Filter */}
          <div className="inline-flex rounded-lg border border-umber-200 bg-white p-0.5 text-xs font-medium dark:border-umber-800 dark:bg-umber-900">
            {[
              { label: "All", value: "all" },
              { label: "Widget", value: "embed" },
              { label: "Link", value: "link" },
            ].map((s) => (
              <Link
                key={s.value}
                href={`/dashboard/forms/${form.id}/responses?source=${s.value}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`}
                className={cn(
                  "rounded-md px-2.5 py-1 transition",
                  sourceFilter === s.value
                    ? "bg-bronze-600 text-white dark:bg-bronze-500"
                    : "text-umber-600 hover:text-umber-900 dark:text-umber-400",
                )}
              >
                {s.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <p className="text-xs text-umber-500">
            {pluralize(total, "response")} found
          </p>
          <a href={`/dashboard/forms/${form.id}/responses/export`} className={buttonClass("secondary", "sm")}>
            <Download className="size-4" aria-hidden /> Export CSV
          </a>
        </div>
      </div>

      {total === 0 ? (
        <div className="rounded-xl border border-dashed border-umber-300 bg-white p-10 text-center dark:border-umber-700 dark:bg-umber-900">
          <p className="text-sm font-medium">No matching responses found</p>
          <p className="mt-1 text-xs text-umber-500">Try adjusting your search query or source filter.</p>
          <Link
            href={`/dashboard/forms/${form.id}/responses`}
            className={buttonClass("secondary", "sm", "mt-3")}
          >
            Clear filters
          </Link>
        </div>
      ) : (
        <ol className="space-y-3">
          {pagedResponses.map((response, i) => (
            <li
              key={response.id}
              className="rounded-xl border border-umber-200 bg-white shadow-xs dark:border-umber-800 dark:bg-umber-900"
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-umber-100 px-4 py-3 sm:px-5 dark:border-umber-800">
                <span className="text-sm font-semibold">#{total - from - i}</span>
                <span className="text-sm text-umber-600 dark:text-umber-400">
                  <LocalTime iso={response.submitted_at} />
                </span>
                <SourceBadge source={response.source} />
                <div className="ml-auto">
                  <DeleteResponseButton responseId={response.id} />
                </div>
              </div>
              <dl className="grid gap-x-6 gap-y-3 px-4 py-4 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:px-5">
                {response.answers.map((a) => (
                  <div key={a.questionId} className="contents">
                    <dt className="text-sm text-umber-400">{a.label}</dt>
                    <dd
                      className={cn(
                        "-mt-2 text-sm whitespace-pre-wrap break-words sm:mt-0",
                        a.value ? "text-umber-900 dark:text-umber-100" : "text-umber-400",
                      )}
                    >
                      {a.type === "email" && a.value ? (
                        <a
                          href={`mailto:${a.value}`}
                          className="text-bronze-600 hover:underline dark:text-bronze-400 font-medium"
                        >
                          {a.value}
                        </a>
                      ) : a.type === "file" && a.value ? (
                        <FileAnswerView raw={a.value} />
                      ) : a.type === "rating" && a.value ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                          <Star className="size-3.5 fill-current" />
                          {a.value} / 5
                        </span>
                      ) : (
                        formatAnswer(a.type, a.value)
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ol>
      )}

      {pageCount > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-between gap-3 pt-2">
          <PageLink formId={form.id} page={page - 1} disabled={page <= 1} query={searchQuery} source={sourceFilter}>
            ← Newer
          </PageLink>
          <span className="text-sm text-umber-600 dark:text-umber-400">
            Page {page} of {pageCount}
          </span>
          <PageLink formId={form.id} page={page + 1} disabled={page >= pageCount} query={searchQuery} source={sourceFilter}>
            Older →
          </PageLink>
        </nav>
      )}
    </div>
  );
}

function FileAnswerView({ raw }: { raw: string }) {
  let parsed: { name?: string; size?: number; dataUrl?: string } | null = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // not JSON
  }

  if (parsed?.name) {
    return (
      <div className="inline-flex items-center gap-2 rounded-lg bg-umber-50 px-2.5 py-1 text-xs font-medium text-umber-800 dark:bg-umber-950 dark:text-umber-200">
        <Paperclip className="size-3.5 text-bronze-600" />
        <span>{parsed.name}</span>
        {parsed.size && <span className="text-umber-400">({Math.round(parsed.size / 1024)} KB)</span>}
        {parsed.dataUrl && (
          <a
            href={parsed.dataUrl}
            download={parsed.name}
            className="ml-1 text-bronze-600 hover:underline dark:text-bronze-400"
          >
            Download
          </a>
        )}
      </div>
    );
  }

  return <span>{raw}</span>;
}

function PageLink({
  formId,
  page,
  disabled,
  query,
  source,
  children,
}: {
  formId: string;
  page: number;
  disabled: boolean;
  query?: string;
  source?: string;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span aria-disabled className={buttonClass("secondary", "sm", "pointer-events-none opacity-50")}>
        {children}
      </span>
    );
  }
  const href = `/dashboard/forms/${formId}/responses?page=${page}${query ? `&q=${encodeURIComponent(query)}` : ""}${source && source !== "all" ? `&source=${source}` : ""}`;
  return (
    <Link href={href} className={buttonClass("secondary", "sm")}>
      {children}
    </Link>
  );
}

function SourceBadge({ source }: { source: FormResponse["source"] }) {
  const embed = source === "embed";
  const Icon = embed ? Globe : Link2;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-umber-100 px-2 py-0.5 text-xs font-medium text-umber-600 dark:bg-umber-800 dark:text-umber-300">
      <Icon className="size-3" aria-hidden />
      {embed ? "Website widget" : "Direct link"}
    </span>
  );
}

function ResponsesSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading responses">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-36 animate-pulse rounded-xl bg-umber-200/60 dark:bg-umber-800" />
      ))}
    </div>
  );
}
