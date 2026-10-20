import type { Metadata } from "next";
import { Suspense } from "react";
import { DashboardFormsList } from "@/components/dashboard/dashboard-forms-list";
import { NewFormButton } from "@/components/dashboard/new-form-button";
import { listOwnedForms } from "@/lib/forms";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your forms</h1>
          <p className="mt-1 text-sm text-umber-600 dark:text-umber-400">
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
        <DashboardFormsList forms={forms} />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-umber-200 bg-white p-5 dark:border-umber-800 dark:bg-umber-900">
      <dt className="text-sm text-umber-600 dark:text-umber-400">{label}</dt>
      <dd className="text-bronze-metal mt-1 font-display text-4xl font-bold tabular-nums tracking-tight">
        {value}
      </dd>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-umber-300 bg-white px-6 py-16 text-center dark:border-umber-700 dark:bg-umber-900">
      <p className="font-medium">No forms yet</p>
      <p className="mx-auto mt-1 mb-6 max-w-sm text-sm text-umber-600 dark:text-umber-400">
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
          <div key={i} className="h-24 animate-pulse rounded-xl bg-umber-200/60 dark:bg-umber-800" />
        ))}
      </div>
      <div className="h-48 animate-pulse rounded-xl bg-umber-200/60 dark:bg-umber-800" />
    </div>
  );
}
