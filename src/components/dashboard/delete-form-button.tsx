"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteForm } from "@/app/dashboard/actions";
import { pluralize } from "@/lib/utils";
import { buttonClass } from "../ui/button";
import { ConfirmDialog } from "../ui/confirm-dialog";

export function DeleteFormButton({
  formId,
  title,
  responseCount,
  redirectTo,
}: {
  formId: string;
  title: string;
  responseCount: number;
  redirectTo?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function confirm() {
    startTransition(async () => {
      const result = await deleteForm(formId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setOpen(false);
      toast.success(`Deleted “${title}”`);
      if (redirectTo) router.push(redirectTo);
    });
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClass("danger-ghost", "sm")}>
        Delete
      </button>
      <ConfirmDialog
        open={open}
        pending={pending}
        title="Delete this form?"
        description={
          <p>
            “{title}” and its {pluralize(responseCount, "response")} will be permanently deleted. Any website
            embedding it will stop showing the widget. This can’t be undone.
          </p>
        }
        confirmLabel="Delete form"
        onConfirm={confirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
