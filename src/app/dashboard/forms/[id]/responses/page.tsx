import { Download, Globe, Link2 } from "lucide-react";
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

  const total = form.responseCount;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(query.page) || 1), pageCount);
  const from = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("responses")
    .select("id, form_id, answers, source, submitted_at")
    .eq("form_id", form.id)
    .order("submitted_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1)
    .returns<FormResponse[]>();

  if (error) throw new Error(`Could not load responses: ${error.message}`);
  const responses = data ?? [];

  if (total === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center dark:border-zinc-700 dark:bg-zinc-900">
        <p className="font-medium">No responses yet</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {pluralize(total, "response")} · newest first
        </p>
        <a href={`/dashboard/forms/${form.id}/responses/export`} className={buttonClass("secondary", "sm")}>
          <Download className="size-4" aria-hidden /> Export CSV
        </a>
      </div>

      <ol className="space-y-3">
        {responses.map((response, i) => (
          <li
            key={response.id}
            className="rounded-xl border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-zinc-100 px-4 py-3 sm:px-5 dark:border-zinc-800">
              <span className="text-sm font-semibold">#{total - from - i}</span>
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
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
                  <dt className="text-sm text-zinc-500">{a.label}</dt>
                  <dd
                    className={cn(
                      "-mt-2 text-sm whitespace-pre-wrap break-words sm:mt-0",
                      a.value ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400",
                    )}
                  >
                    {a.type === "email" && a.value ? (
                      <a
                        href={`mailto:${a.value}`}
                        className="text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        {a.value}
                      </a>
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

      {pageCount > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-between gap-3 pt-2">
          <PageLink formId={form.id} page={page - 1} disabled={page <= 1}>
            ← Newer
          </PageLink>
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            Page {page} of {pageCount}
          </span>
          <PageLink formId={form.id} page={page + 1} disabled={page >= pageCount}>
            Older →
          </PageLink>
        </nav>
      )}
    </div>
  );
}

function PageLink({
  formId,
  page,
  disabled,
  children,
}: {
  formId: string;
  page: number;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span aria-disabled className={buttonClass("secondary", "sm", "pointer-events-none opacity-50")}>
        {children}
      </span>
    );
  }
  return (
    <Link
      href={`/dashboard/forms/${formId}/responses?page=${page}`}
      className={buttonClass("secondary", "sm")}
    >
      {children}
    </Link>
  );
}

function SourceBadge({ source }: { source: FormResponse["source"] }) {
  const embed = source === "embed";
  const Icon = embed ? Globe : Link2;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
      <Icon className="size-3" aria-hidden />
      {embed ? "Website widget" : "Public link"}
    </span>
  );
}

function ResponsesSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading responses">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-36 animate-pulse rounded-xl bg-zinc-200/60 dark:bg-zinc-800" />
      ))}
    </div>
  );
}
