"use server";

import { customAlphabet } from "nanoid";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { isUserSuspended, reactivateUserAccount, requireAdmin, suspendUserAccount } from "@/lib/admin";
import { requireUser } from "@/lib/auth";
import { triggerWebhook } from "@/lib/integrations";
import { createClient } from "@/lib/supabase/server";
import { getTemplateById } from "@/lib/templates";
import type {
  ConditionalLogic,
  FormSettings,
  FormStatus,
  QuestionDraft,
  QuestionType,
  QuestionValidation,
} from "@/lib/types";
import { UUID_RE, uuid } from "@/lib/utils";
import {
  formDraftSchema,
  issuesByPath,
  settingsSchema,
  type FormDraft,
} from "@/lib/validation";

/**
 * Every action: (1) checks the session with requireUser(), (2) validates input
 * with the same Zod schemas the UI uses, (3) filters by owner_id — and RLS in
 * the database enforces ownership again underneath.
 */

export type ActionResult = {
  ok: true;
  formId?: string;
} | {
  ok: false;
  error: string;
  fieldErrors?: Record<string, string>;
};

// Short, unguessable public ids without look-alike characters (0/o, 1/l/i).
const newSlug = customAlphabet("23456789abcdefghjkmnpqrstuvwxyz", 10);

const fail = (error: string, fieldErrors?: Record<string, string>): ActionResult => ({
  ok: false,
  error,
  fieldErrors,
});

export async function createForm() {
  const user = await requireUser();
  if (isUserSuspended(user.id)) {
    redirect("/login?error=account_suspended");
  }
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
  }
  if (!formId) throw new Error("Could not create form. Please try again.");

  redirect(`/dashboard/forms/${formId}`);
}

export async function createFormFromTemplate(templateId: string) {
  const user = await requireUser();
  if (isUserSuspended(user.id)) {
    redirect("/login?error=account_suspended");
  }

  const template = getTemplateById(templateId);
  if (!template) throw new Error("Template not found");

  const supabase = await createClient();
  const questions = template.buildQuestions();

  const questionMeta: NonNullable<FormSettings["questionMeta"]> = {};
  const rpcQuestions = questions.map((q) => {
    questionMeta[q.id] = {
      type: q.type,
      options: q.options,
      logic: q.logic ?? null,
      validation: q.validation ?? null,
    };
    let safeType = q.type;
    if (q.type === "dropdown") safeType = "multiple_choice";
    else if (q.type === "rating" || q.type === "date" || q.type === "file") safeType = "text";
    return {
      id: q.id,
      type: safeType,
      label: q.label,
      required: q.required,
      options: q.options,
      position: 0,
    };
  });

  const settings: FormSettings = {
    ...template.settings,
    questionMeta,
  };

  const { data: newForm, error: insertError } = await supabase
    .from("forms")
    .insert({
      owner_id: user.id,
      title: template.name,
      description: template.description,
      slug: newSlug(),
      settings,
      status: "draft",
    })
    .select("id")
    .single();

  if (insertError || !newForm) {
    throw new Error(`Could not create form from template: ${insertError?.message}`);
  }

  await supabase.rpc("save_form", {
    p_form_id: newForm.id,
    p_title: template.name,
    p_description: template.description,
    p_questions: rpcQuestions,
  });

  redirect(`/dashboard/forms/${newForm.id}`);
}

export async function saveForm(formId: string, draft: FormDraft): Promise<ActionResult> {
  const user = await requireUser();
  if (isUserSuspended(user.id)) return fail("Your account is suspended.");
  if (!UUID_RE.test(formId)) return fail("Form not found");

  const parsed = formDraftSchema.safeParse(draft);
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", issuesByPath(parsed.error));
  }

  const supabase = await createClient();

  // Build questionMeta for extended question properties
  const questionMeta: NonNullable<FormSettings["questionMeta"]> = {};
  const rpcQuestions = parsed.data.questions.map((q) => {
    questionMeta[q.id] = {
      type: q.type,
      options: q.options,
      logic: q.logic ?? null,
      validation: q.validation ?? null,
    };

    // Convert to DB-safe type for backwards compatibility with postgres check constraints
    let safeType = q.type;
    if (q.type === "dropdown") safeType = "multiple_choice";
    else if (q.type === "rating" || q.type === "date" || q.type === "file") safeType = "text";

    return {
      id: q.id,
      type: safeType,
      label: q.label,
      required: q.required,
      options: q.options,
    };
  });

  // Preserve existing form settings and update questionMeta
  const { data: currentForm } = await supabase
    .from("forms")
    .select("settings")
    .eq("id", formId)
    .eq("owner_id", user.id)
    .single();

  const currentSettings = (currentForm?.settings ?? {}) as FormSettings;
  const updatedSettings = {
    ...currentSettings,
    questionMeta,
  };

  await supabase
    .from("forms")
    .update({ settings: updatedSettings })
    .eq("id", formId)
    .eq("owner_id", user.id);

  // Execute atomic save_form stored procedure
  const { error } = await supabase.rpc("save_form", {
    p_form_id: formId,
    p_title: parsed.data.title,
    p_description: parsed.data.description,
    p_questions: rpcQuestions,
  });

  if (error) {
    return fail(error.code === "P0002" ? "Form not found" : `Could not save: ${error.message}`);
  }
  refresh();
  return { ok: true };
}

export async function duplicateForm(formId: string): Promise<ActionResult> {
  const user = await requireUser();
  if (isUserSuspended(user.id)) return fail("Your account is suspended.");
  if (!UUID_RE.test(formId)) return fail("Form not found");

  const supabase = await createClient();

  // Load existing form and its questions
  const { data: source, error } = await supabase
    .from("forms")
    .select("*, questions(*)")
    .eq("id", formId)
    .eq("owner_id", user.id)
    .order("position", { referencedTable: "questions" })
    .single();

  if (error || !source) return fail("Form not found");

  const newFormTitle = `${source.title} (Copy)`.slice(0, 120);
  const newSlugStr = newSlug();

  // Map old question IDs to new question IDs so conditional logic stays connected
  const idMap = new Map<string, string>();
  const oldQuestions = (source.questions ?? []) as Array<{
    id: string;
    type: string;
    label: string;
    required: boolean;
    options?: string[] | null;
    position?: number;
    logic?: ConditionalLogic | null;
    validation?: QuestionValidation | null;
  }>;
  for (const q of oldQuestions) {
    idMap.set(q.id, uuid());
  }

  const rawMeta = (source.settings?.questionMeta ?? {}) as Record<
    string,
    {
      type?: QuestionType;
      options?: string[] | null;
      logic?: ConditionalLogic | null;
      validation?: QuestionValidation | null;
    }
  >;
  const duplicatedQuestionMeta: NonNullable<FormSettings["questionMeta"]> = {};

  const duplicatedQuestions: QuestionDraft[] = oldQuestions.map((q) => {
    const newId = idMap.get(q.id) ?? uuid();
    const meta = rawMeta[q.id];
    const trueType = (meta?.type || q.type) as QuestionType;
    const oldLogic = meta?.logic ?? q.logic;

    const newLogic =
      oldLogic && idMap.has(oldLogic.dependsOn)
        ? { ...oldLogic, dependsOn: idMap.get(oldLogic.dependsOn)! }
        : null;

    duplicatedQuestionMeta[newId] = {
      type: trueType,
      options: meta?.options ?? q.options ?? null,
      logic: newLogic,
      validation: meta?.validation ?? q.validation ?? null,
    };

    return {
      id: newId,
      type: trueType,
      label: q.label ?? "",
      required: Boolean(q.required),
      options: meta?.options ?? q.options ?? null,
      logic: newLogic,
      validation: meta?.validation ?? q.validation ?? null,
    };
  });

  const duplicatedSettings: FormSettings = {
    ...source.settings,
    questionMeta: duplicatedQuestionMeta,
  };

  const { data: created, error: createError } = await supabase
    .from("forms")
    .insert({
      owner_id: user.id,
      title: newFormTitle,
      description: source.description,
      slug: newSlugStr,
      status: "draft",
      settings: duplicatedSettings,
    })
    .select("id")
    .single();

  if (createError || !created) return fail(`Could not duplicate form: ${createError?.message}`);

  const rpcQuestions = duplicatedQuestions.map((q) => {
    let safeType = q.type;
    if (q.type === "dropdown") safeType = "multiple_choice";
    else if (q.type === "rating" || q.type === "date" || q.type === "file") safeType = "text";
    return {
      id: q.id,
      type: safeType,
      label: q.label,
      required: q.required,
      options: q.options,
    };
  });

  await supabase.rpc("save_form", {
    p_form_id: created.id,
    p_title: newFormTitle,
    p_description: source.description ?? "",
    p_questions: rpcQuestions,
  });

  refresh();
  return { ok: true, formId: created.id };
}

export async function setFormStatus(formId: string, status: FormStatus): Promise<ActionResult> {
  const user = await requireUser();
  if (isUserSuspended(user.id)) return fail("Your account is suspended.");
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
  input: Partial<FormSettings>,
): Promise<ActionResult> {
  const user = await requireUser();
  if (isUserSuspended(user.id)) return fail("Your account is suspended.");
  if (!UUID_RE.test(formId)) return fail("Form not found");

  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return fail("Please fix the highlighted fields.", issuesByPath(parsed.error));

  const supabase = await createClient();

  const { data: current } = await supabase
    .from("forms")
    .select("settings")
    .eq("id", formId)
    .eq("owner_id", user.id)
    .single();

  const merged = {
    ...((current?.settings ?? {}) as FormSettings),
    ...parsed.data,
  };

  const { data, error } = await supabase
    .from("forms")
    .update({ settings: merged })
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
  const { data, error } = await supabase
    .from("responses")
    .delete()
    .eq("id", responseId)
    .select("id");

  if (error) return fail(`Could not delete: ${error.message}`);
  if (!data?.length) return fail("Response not found");
  refresh();
  return { ok: true };
}

export async function testWebhookAction(
  formId: string,
  url: string,
  secret?: string,
): Promise<{ ok: boolean; status: number; error?: string }> {
  const user = await requireUser();
  if (!UUID_RE.test(formId)) return { ok: false, status: 0, error: "Form not found" };

  const supabase = await createClient();
  const { data: form } = await supabase
    .from("forms")
    .select("title, slug")
    .eq("id", formId)
    .eq("owner_id", user.id)
    .single();

  if (!form) return { ok: false, status: 0, error: "Form not found" };

  return triggerWebhook({
    formId,
    formTitle: form.title,
    slug: form.slug,
    url,
    secret,
  });
}

// ── Admin Actions ──────────────────────────────────────────────────────────

export async function adminSuspendUser(userId: string): Promise<ActionResult> {
  await requireAdmin();
  suspendUserAccount(userId);
  refresh();
  return { ok: true };
}

export async function adminReactivateUser(userId: string): Promise<ActionResult> {
  await requireAdmin();
  reactivateUserAccount(userId);
  refresh();
  return { ok: true };
}
