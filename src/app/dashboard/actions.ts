"use server";

import { customAlphabet } from "nanoid";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FormStatus } from "@/lib/types";
import { UUID_RE } from "@/lib/utils";
import { formDraftSchema, issuesByPath, settingsSchema, type FormDraft } from "@/lib/validation";

/**
 * Every action: (1) checks the session with requireUser(), (2) validates input
 * with the same Zod schemas the UI uses, (3) filters by owner_id — and RLS in
 * the database enforces ownership again underneath.
 */

export type ActionResult = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> };

// Short, unguessable public ids without look-alike characters (0/o, 1/l/i).
const newSlug = customAlphabet("23456789abcdefghjkmnpqrstuvwxyz", 10);

const fail = (error: string, fieldErrors?: Record<string, string>): ActionResult => ({
  ok: false,
  error,
  fieldErrors,
});

export async function createForm() {
  const user = await requireUser();
  const supabase = await createClient();

  let formId: string | null = null;
  for (let attempt = 0; attempt < 3 && !formId; attempt++) {
    const { data, error } = await supabase
      .from("forms")
      .insert({ owner_id: user.id, title: "Untitled form", slug: newSlug(), settings: {} })
      .select("id")
      .single();
    if (data) formId = data.id;
    else if (error?.code !== "23505") throw new Error(`Could not create form: ${error?.message}`);
    // 23505 = unique violation on slug (astronomically rare) → try a new slug
  }
  if (!formId) throw new Error("Could not create form. Please try again.");

  redirect(`/dashboard/forms/${formId}`);
}

export async function saveForm(formId: string, draft: FormDraft): Promise<ActionResult> {
  await requireUser();
  if (!UUID_RE.test(formId)) return fail("Form not found");

  const parsed = formDraftSchema.safeParse(draft);
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", issuesByPath(parsed.error));
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_form", {
    p_form_id: formId,
    p_title: parsed.data.title,
    p_description: parsed.data.description,
    p_questions: parsed.data.questions,
  });

  if (error) {
    return fail(error.code === "P0002" ? "Form not found" : `Could not save: ${error.message}`);
  }
  refresh();
  return { ok: true };
}

export async function setFormStatus(formId: string, status: FormStatus): Promise<ActionResult> {
  const user = await requireUser();
  if (!UUID_RE.test(formId) || (status !== "draft" && status !== "published")) {
    return fail("Invalid request");
  }
  const supabase = await createClient();

  if (status === "published") {
    const { count, error } = await supabase
      .from("questions")
      .select("id", { count: "exact", head: true })
      .eq("form_id", formId);
    if (error) return fail(`Could not publish: ${error.message}`);
    if (!count) return fail("Add at least one question and save before publishing.");
  }

  const { data, error } = await supabase
    .from("forms")
    .update({ status })
    .eq("id", formId)
    .eq("owner_id", user.id)
    .select("id");

  if (error) return fail(`Could not update status: ${error.message}`);
  if (!data?.length) return fail("Form not found");
  refresh();
  return { ok: true };
}

export async function deleteForm(formId: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!UUID_RE.test(formId)) return fail("Form not found");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("forms")
    .delete()
    .eq("id", formId)
    .eq("owner_id", user.id)
    .select("id");

  if (error) return fail(`Could not delete: ${error.message}`);
  if (!data?.length) return fail("Form not found");
  refresh();
  return { ok: true };
}

export async function saveSettings(
  formId: string,
  input: { primaryColor: string; welcomeMessage: string; completionMessage: string },
): Promise<ActionResult> {
  const user = await requireUser();
  if (!UUID_RE.test(formId)) return fail("Form not found");

  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return fail("Please fix the highlighted fields.", issuesByPath(parsed.error));

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("forms")
    .update({ settings: parsed.data })
    .eq("id", formId)
    .eq("owner_id", user.id)
    .select("id");

  if (error) return fail(`Could not save: ${error.message}`);
  if (!data?.length) return fail("Form not found");
  refresh();
  return { ok: true };
}

export async function deleteResponse(responseId: string): Promise<ActionResult> {
  await requireUser();
  if (!UUID_RE.test(responseId)) return fail("Response not found");

  const supabase = await createClient();
  // RLS only lets owners of the parent form delete a response.
  const { data, error } = await supabase.from("responses").delete().eq("id", responseId).select("id");

  if (error) return fail(`Could not delete: ${error.message}`);
  if (!data?.length) return fail("Response not found");
  refresh();
  return { ok: true };
}
