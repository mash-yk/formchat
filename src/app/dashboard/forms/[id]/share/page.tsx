import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SharePanel } from "@/components/share/share-panel";
import { getOwnedForm } from "@/lib/forms";
import { resolveSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Share & embed" };

export default function SharePage({ params }: PageProps<"/dashboard/forms/[id]/share">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-zinc-200/60 dark:bg-zinc-800" />}>
      <Share params={params} />
    </Suspense>
  );
}

async function Share({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const form = await getOwnedForm(id);
  if (!form) notFound();

  return (
    <SharePanel
      formId={form.id}
      slug={form.slug}
      title={form.title}
      status={form.status}
      settings={resolveSettings(form.settings)}
      questions={form.questions.map(({ id, type, label, required, options }) => ({
        id,
        type,
        label,
        required,
        options,
      }))}
    />
  );
}
