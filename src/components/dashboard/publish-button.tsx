"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { setFormStatus } from "@/app/dashboard/actions";
import type { FormStatus } from "@/lib/types";
import { buttonClass } from "../ui/button";
import { useUnsavedChanges } from "./unsaved-changes";

export function PublishButton({
  formId,
  status,
  size = "sm",
}: {
  formId: string;
  status: FormStatus;
  size?: "sm" | "md";
}) {
  const [pending, startTransition] = useTransition();
  const unsaved = useUnsavedChanges();
  const published = status === "published";

  function toggle() {
    if (unsaved?.dirty && !published) {
      toast.error("Save your changes first, then publish.");
      return;
    }
    startTransition(async () => {
      const result = await setFormStatus(formId, published ? "draft" : "published");
      if (result.ok) {
        toast.success(published ? "Form unpublished — it no longer accepts responses." : "Form published 🎉");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={buttonClass(published ? "secondary" : "primary", size)}
    >
      {pending ? (published ? "Unpublishing…" : "Publishing…") : published ? "Unpublish" : "Publish"}
    </button>
  );
}
