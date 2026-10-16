import type { Metadata } from "next";
import { Suspense } from "react";
import { ChatForm } from "@/components/chat/chat-form";
import { ChatSkeleton, FormUnavailable } from "@/components/chat/unavailable";
import { getPublishedForm } from "@/lib/forms";

export const metadata: Metadata = { title: "Chat", robots: { index: false } };

/**
 * Loaded by widget.js inside an iframe on external websites. The iframe keeps
 * the host site's CSS and ours fully isolated. Framing is allowed for /embed/*
 * only (see headers() in next.config.ts).
 */
export default function EmbedPage({ params }: PageProps<"/embed/[slug]">) {
  return (
    <main className="h-dvh overflow-hidden bg-white">
      <Suspense fallback={<ChatSkeleton />}>
        <EmbeddedForm params={params} />
      </Suspense>
    </main>
  );
}

async function EmbeddedForm({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const form = await getPublishedForm(slug);
  if (!form) return <FormUnavailable embedded />;
  return <ChatForm form={form} mode="live" source="embed" variant="embed" />;
}
