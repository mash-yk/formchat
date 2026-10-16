"use client";

import { useState } from "react";
import { toast } from "sonner";
import { buttonClass } from "./button";

export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Clipboard API is blocked on plain-http LAN addresses; fall back to a hidden textarea.
      const el = document.createElement("textarea");
      el.value = value;
      el.setAttribute("readonly", "");
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand("copy");
      el.remove();
      if (!ok) {
        toast.error("Couldn't copy — please select the text and copy it manually.");
        return;
      }
    }
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button type="button" onClick={copy} className={buttonClass("secondary", "sm", "shrink-0")}>
      {copied ? "Copied ✓" : label}
    </button>
  );
}
