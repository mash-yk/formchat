"use client";

import Link from "next/link";
import { createContext, useContext, useState } from "react";

type UnsavedChanges = { dirty: boolean; setDirty: (dirty: boolean) => void };

const UnsavedChangesContext = createContext<UnsavedChanges | null>(null);

/** Lets the builder tell the header/tabs that there are unsaved edits. */
export function UnsavedChangesProvider({ children }: { children: React.ReactNode }) {
  const [dirty, setDirty] = useState(false);
  return <UnsavedChangesContext value={{ dirty, setDirty }}>{children}</UnsavedChangesContext>;
}

export function useUnsavedChanges() {
  return useContext(UnsavedChangesContext);
}

export const LEAVE_MESSAGE = "You have unsaved changes. Leave without saving?";

/** A Next.js Link that asks for confirmation when the builder has unsaved changes. */
export function GuardedLink({ onClick, ...props }: React.ComponentProps<typeof Link>) {
  const unsaved = useUnsavedChanges();
  return (
    <Link
      {...props}
      onClick={(e) => {
        if (unsaved?.dirty && !window.confirm(LEAVE_MESSAGE)) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
    />
  );
}
