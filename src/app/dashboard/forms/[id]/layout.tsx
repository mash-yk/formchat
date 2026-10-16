import { ArrowLeft, ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DeleteFormButton } from "@/components/dashboard/delete-form-button";
import { FormTabs } from "@/components/dashboard/form-tabs";
import { PublishButton } from "@/components/dashboard/publish-button";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { GuardedLink, UnsavedChangesProvider } from "@/components/dashboard/unsaved-changes";
import { buttonClass } from "@/components/ui/button";
import { getOwnedForm } from "@/lib/forms";

export default function FormLayout({ children, params }: LayoutProps<"/dashboard/forms/[id]">) {
  return (
    <UnsavedChangesProvider>
      <div className="space-y-6">
        <GuardedLink
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-umber-600 hover:text-umber-900 dark:text-umber-400 dark:hover:text-umber-100"
        >
          <ArrowLeft className="size-4" aria-hidden /> All forms
        </GuardedLink>
        <Suspense
          fallback={<div className="h-28 animate-pulse rounded-xl bg-umber-200/60 dark:bg-umber-800" />}
        >
          <FormHeader params={params} />
        </Suspense>
        {children}
      </div>
    </UnsavedChangesProvider>
  );
}

async function FormHeader({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const form = await getOwnedForm(id);
  if (!form) notFound();

  return (
    <header className="border-b border-umber-200 dark:border-umber-800">
      <div className="flex flex-wrap items-start justify-between gap-4 pb-4">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{form.title}</h1>
            <StatusBadge status={form.status} />
          </div>
          <p className="text-sm text-umber-400">
            Public link: <span className="font-mono">/f/{form.slug}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {form.status === "published" && (
            <a
              href={`/f/${form.slug}`}
              target="_blank"
              rel="noreferrer"
              className={buttonClass("secondary", "sm")}
            >
              <ExternalLink className="size-4" aria-hidden /> Open live form
            </a>
          )}
          <PublishButton formId={form.id} status={form.status} />
          <DeleteFormButton
            formId={form.id}
            title={form.title}
            responseCount={form.responseCount}
            redirectTo="/dashboard"
          />
        </div>
      </div>
      <FormTabs formId={form.id} />
    </header>
  );
}
