"use client";

import { useEffect, useRef } from "react";
import { buttonClass } from "./button";

type Props = {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Accessible modal confirmation built on the native <dialog> element (focus trap + Esc for free). */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  pending,
  onConfirm,
  onCancel,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        if (!pending) onCancel();
      }}
      onClick={(e) => {
        if (e.target === ref.current && !pending) onCancel(); // click on backdrop
      }}
      aria-labelledby="confirm-title"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-umber-200 bg-white p-0 text-umber-900 shadow-xl backdrop:bg-umber-950/50 dark:border-umber-800 dark:bg-umber-900 dark:text-umber-100"
    >
      <div className="space-y-2 p-6">
        <h2 id="confirm-title" className="text-lg font-semibold">
          {title}
        </h2>
        <div className="text-sm text-umber-600 dark:text-umber-400">{description}</div>
      </div>
      <div className="flex justify-end gap-2 border-t border-umber-200 bg-umber-50 px-6 py-4 dark:border-umber-800 dark:bg-umber-950/40">
        <button type="button" className={buttonClass("secondary")} onClick={onCancel} disabled={pending}>
          Cancel
        </button>
        <button type="button" className={buttonClass("danger")} onClick={onConfirm} disabled={pending}>
          {pending ? "Deleting…" : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
