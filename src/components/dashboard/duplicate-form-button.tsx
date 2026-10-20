"use client";

import { Copy, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { duplicateForm } from "@/app/dashboard/actions";
import { buttonClass } from "../ui/button";

export function DuplicateFormButton({
  formId,
  variant = "secondary",
  size = "sm",
  label = "Duplicate",
}: {
  formId: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
  label?: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onDuplicate() {
    startTransition(async () => {
      const res = await duplicateForm(formId);
      if (!res.ok) {
        toast.error(res.error || "Could not duplicate form");
      } else if (res.formId) {
        toast.success("Form duplicated as a new draft.");
        router.push(`/dashboard/forms/${res.formId}`);
      } else {
        toast.error("Could not duplicate form");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onDuplicate}
      disabled={pending}
      title="Duplicate form"
      className={buttonClass(variant, size)}
    >
      {pending ? (
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
      ) : (
        <Copy className="size-3.5" aria-hidden />
      )}
      {label}
    </button>
  );
}
