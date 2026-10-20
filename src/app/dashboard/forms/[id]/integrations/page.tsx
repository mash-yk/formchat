import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { IntegrationsPanel } from "@/components/integrations/integrations-panel";
import { getOwnedForm } from "@/lib/forms";
import { getWebhookLogs } from "@/lib/integrations";

export const metadata: Metadata = { title: "Integrations & Webhooks" };

export default function IntegrationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={<div className="h-96 animate-pulse rounded-xl bg-umber-200/60 dark:bg-umber-800" />}
    >
      <IntegrationsContent params={params} />
    </Suspense>
  );
}

async function IntegrationsContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const form = await getOwnedForm(id);
  if (!form) notFound();

  const logs = getWebhookLogs(form.id);

  return (
    <div className="space-y-6">
      <IntegrationsPanel
        formId={form.id}
        slug={form.slug}
        settings={form.settings}
        initialLogs={logs}
      />
    </div>
  );
}
