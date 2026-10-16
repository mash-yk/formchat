import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { DeleteFormButton } from "@/components/dashboard/delete-form-button";
import { NewFormButton } from "@/components/dashboard/new-form-button";
import { PublishButton } from "@/components/dashboard/publish-button";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { buttonClass } from "@/components/ui/button";
import { LocalTime } from "@/components/ui/local-time";
import { listOwnedForms, type FormListItem } from "@/lib/forms";
import { pluralize } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your forms</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Create forms, publish them and collect responses through your chat widget.
          </p>
        </div>
        <NewFormButton />
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}

async function DashboardContent() {
  const forms = await listOwnedForms();
  const totalResponses = forms.reduce((sum, f) => sum + f.responseCount, 0);
  const published = forms.filter((f) => f.status === "published").length;

  return (
    <div className="space-y-8">
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Total forms" value={forms.length} />
        <Stat label="Published" value={published} />
        <Stat label="Total responses" value={totalResponses} />
      </dl>

      {forms.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
          {forms.map((form) => (
            <FormRow key={form.id} form={form} />
          ))}
        </ul>
      )}
    </div>
  );
}

function FormRow({ form }: { form: FormListItem }) {
  const base = `/dashboard/forms/${form.id}`;
  return (
    <li className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={base} className="truncate font-medium hover:text-indigo-600 hover:underline">
            {form.title}
          </Link>
          <StatusBadge status={form.status} />
        </div>
        <p className="text-xs text-zinc-500">
          {pluralize(form.questionCount, "question")} ·{" "}
          <Link href={`${base}/responses`} className="hover:underline">
            {pluralize(form.responseCount, "response")}
          </Link>{" "}
          · Updated <LocalTime iso={form.updated_at} style="relative" />
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link href={base} className={buttonClass("secondary", "sm")}>
          Edit
        </Link>
        <Link href={`${base}/responses`} className={buttonClass("secondary", "sm")}>
          Responses
        </Link>
        <Link href={`${base}/share`} className={buttonClass("secondary", "sm")}>
          Share
        </Link>
        <PublishButton formId={form.id} status={form.status} />
        <DeleteFormButton formId={form.id} title={form.title} responseCount={form.responseCount} />
      </div>
    </li>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <dt className="text-sm text-zinc-600 dark:text-zinc-400">{label}</dt>
      <dd className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">{value}</dd>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center dark:border-zinc-700 dark:bg-zinc-900">
      <p className="font-medium">No forms yet</p>
      <p className="mx-auto mt-1 mb-6 max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
        Create your first form, add a few questions and publish it to start collecting responses.
      </p>
      <div className="flex justify-center">
        <NewFormButton label="Create your first form" />
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-zinc-200/60 dark:bg-zinc-800" />
        ))}
      </div>
      <div className="h-48 animate-pulse rounded-xl bg-zinc-200/60 dark:bg-zinc-800" />
    </div>
  );
}
