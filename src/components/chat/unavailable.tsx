import { MessageCircleOff } from "lucide-react";
import { EmbedCloseButton } from "./embed-close-button";

export function FormUnavailable({ embedded = false }: { embedded?: boolean }) {
  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-3 bg-white p-8 text-center text-umber-900">
      {embedded && <EmbedCloseButton />}
      <span className="grid size-12 place-items-center rounded-full bg-umber-100 text-umber-500">
        <MessageCircleOff className="size-6" aria-hidden />
      </span>
      <h1 className="text-lg font-semibold">This form isn’t accepting responses</h1>
      <p className="max-w-xs text-sm text-umber-600">
        It may have been unpublished, or the link might be incorrect.
        {embedded ? "" : " Please check with whoever shared it with you."}
      </p>
    </div>
  );
}

export function ChatSkeleton() {
  return (
    <div className="flex h-full flex-col bg-white" aria-busy="true" aria-label="Loading form">
      <div className="h-[60px] animate-pulse bg-umber-200" />
      <div className="flex-1 space-y-3 bg-umber-50 p-4">
        <div className="h-9 w-2/3 animate-pulse rounded-2xl bg-umber-200" />
        <div className="h-9 w-1/2 animate-pulse rounded-2xl bg-umber-200" />
      </div>
      <div className="h-[68px] border-t border-umber-200" />
    </div>
  );
}
