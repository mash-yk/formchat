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
    <main className="flex min-h-dvh flex-1 flex-col items-center justify-center bg-zinc-100 sm:p-6">
      <div className="h-dvh w-full overflow-hidden bg-white sm:h-[min(720px,calc(100dvh-6rem))] sm:max-w-lg sm:rounded-2xl sm:shadow-xl sm:ring-1 sm:ring-zinc-200">
        <Suspense fallback={<ChatSkeleton />}>
          <PublicForm params={params} />
        </Suspense>
      </div>
      <p className="hidden pt-4 text-xs text-zinc-500 sm:block">
        Powered by{" "}
        <Link href="/" className="font-medium text-zinc-700 hover:underline">
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
