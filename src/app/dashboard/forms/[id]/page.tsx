import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FormBuilder } from "@/components/builder/form-builder";
import { getOwnedForm } from "@/lib/forms";

export const metadata: Metadata = { title: "Edit form" };

export default function EditFormPage({ params }: PageProps<"/dashboard/forms/[id]">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-zinc-200/60 dark:bg-zinc-800" />}>
      <Builder params={params} />
    </Suspense>
  );
}

async function Builder({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const form = await getOwnedForm(id);
  if (!form) notFound();

  return (
    <FormBuilder
      formId={form.id}
      slug={form.slug}
      status={form.status}
      settings={form.settings}
      initial={{
        title: form.title,
        description: form.description ?? "",
        questions: form.questions.map(({ id, type, label, required, options }) => ({
          id,
          type,
          label,
          required,
          options,
        })),
      }}
    />
  );
}
