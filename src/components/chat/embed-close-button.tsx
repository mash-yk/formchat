"use client";

import { X } from "lucide-react";

/** Close button for the embedded widget; widget.js listens for "formchat:close". */
export function EmbedCloseButton() {
  return (
    <button
      type="button"
      aria-label="Close chat"
      onClick={() => window.parent?.postMessage({ type: "formchat:close" }, "*")}
      className="absolute top-3 right-3 grid size-9 place-items-center rounded-full text-umber-500 transition hover:bg-umber-100 hover:text-umber-900"
    >
      <X className="size-5" />
    </button>
  );
}
