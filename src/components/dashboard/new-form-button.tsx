"use client";

import { useFormStatus } from "react-dom";
import { createForm } from "@/app/dashboard/actions";
import { buttonClass } from "../ui/button";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonClass("primary")}>
      {pending ? "Creating…" : label}
    </button>
  );
}

export function NewFormButton({ label = "+ New form" }: { label?: string }) {
  return (
    <form action={createForm}>
      <Submit label={label} />
    </form>
  );
}
