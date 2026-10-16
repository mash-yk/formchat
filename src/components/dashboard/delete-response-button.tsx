"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteResponse } from "@/app/dashboard/actions";
import { buttonClass } from "../ui/button";
import { ConfirmDialog } from "../ui/confirm-dialog";

export function DeleteResponseButton({ responseId }: { responseId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const result = await deleteResponse(responseId);
      if (result.ok) {
        setOpen(false);
        toast.success("Response deleted");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Delete response"
        className={buttonClass("danger-ghost", "sm", "px-2")}
      >
        <Trash2 className="size-4" aria-hidden />
      </button>
      <ConfirmDialog
        open={open}
        pending={pending}
        title="Delete this response?"
        description="The response will be permanently deleted. This can’t be undone."
        confirmLabel="Delete response"
        onConfirm={confirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
