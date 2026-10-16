import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChatForm } from "@/components/chat/chat-form";
import { ChatSkeleton, FormUnavailable } from "@/components/chat/unavailable";
import { getPublishedForm } from "@/lib/forms";

export const metadata: Metadata = { title: "Form", robots: { index: false } };

/** Public, shareable link for a form: /f/{slug}. Full screen on phones, a card on desktop. */
export default function PublicFormPage({ params }: PageProps<"/f/[slug]">) {
  return (
    <main className="grain flex min-h-dvh flex-1 flex-col items-center justify-center bg-umber-950 bg-[radial-gradient(60%_50%_at_50%_40%,color-mix(in_oklab,var(--color-bronze-500)_22%,transparent),transparent)] sm:p-6">
      <div className="h-dvh w-full overflow-hidden bg-white sm:h-[min(720px,calc(100dvh-6rem))] sm:max-w-lg sm:rounded-2xl sm:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] sm:ring-1 sm:ring-bronze-400/25">
        <Suspense fallback={<ChatSkeleton />}>
          <PublicForm params={params} />
        </Suspense>
      </div>
      <p className="hidden pt-4 text-xs text-umber-400 sm:block">
        Powered by{" "}
        <Link href="/" className="font-medium text-bronze-300 hover:underline">
          Formchat
        </Link>
      </p>
    </main>
  );
}

async function PublicForm({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const form = await getPublishedForm(slug);
  if (!form) return <FormUnavailable />;
  return <ChatForm form={form} mode="live" source="link" variant="page" />;
}
