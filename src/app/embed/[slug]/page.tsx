import type { Metadata } from "next";
import { Suspense } from "react";
import { ChatForm } from "@/components/chat/chat-form";
import { ChatSkeleton, FormUnavailable } from "@/components/chat/unavailable";
import { getPublishedForm } from "@/lib/forms";

export const metadata: Metadata = { title: "Chat", robots: { index: false } };

/**
 * Loaded by widget.js or inline iframe on external websites. The iframe keeps
 * the host site's CSS and ours fully isolated. Framing is allowed for /embed/*
 * only (see headers() in next.config.ts).
 */
export default function EmbedPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <main className="h-full min-h-dvh overflow-hidden bg-white dark:bg-umber-950">
      <Suspense fallback={<ChatSkeleton />}>
        <EmbeddedForm params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function EmbeddedForm({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ slug }, query] = await Promise.all([
    params,
    searchParams ?? Promise.resolve<Record<string, string | string[] | undefined>>({}),
  ]);
  const form = await getPublishedForm(slug);
  if (!form) return <FormUnavailable embedded />;

  const isInline = query?.mode === "inline";
  return (
    <ChatForm
      form={form}
      mode="live"
      source="embed"
      variant={isInline ? "card" : "embed"}
    />
  );
}
