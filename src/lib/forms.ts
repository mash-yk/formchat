import "server-only";
import { cache } from "react";
import { requireUser } from "./auth";
import { createPublicClient } from "./supabase/public";
import { createClient } from "./supabase/server";
import type { ChatFormData, ChatQuestion, Form, FormSettings, FormWithQuestions, Question, QuestionType } from "./types";
import { UUID_RE } from "./utils";

/**
 * Data access for forms. Every owner query filters by owner_id explicitly:
 * RLS also lets logged-in users read *published* forms of other people (so the
 * public pages work), so relying on RLS alone would leak them into dashboards.
 */

const QUESTION_COLUMNS = "id, form_id, type, label, required, options, position";

function hydrateQuestion(
  raw: Record<string, unknown> & { id: string },
  metaMap?: FormSettings["questionMeta"],
): Question {
  const meta = metaMap?.[raw.id];
  return {
    id: raw.id,
    form_id: (raw.form_id as string) ?? "",
    type: (meta?.type || (raw.type as string)) as QuestionType,
    label: (raw.label as string) ?? "",
    required: Boolean(raw.required),
    options: (meta?.options as string[] | null) ?? (raw.options as string[] | null) ?? null,
    position: (raw.position as number) ?? 0,
    logic: meta?.logic ?? (raw.logic as Question["logic"]) ?? null,
    validation: meta?.validation ?? (raw.validation as Question["validation"]) ?? null,
  };
}

/** One of the current user's forms with its questions, or null. Cached per request. */
export const getOwnedForm = cache(
  async (id: string): Promise<(FormWithQuestions & { responseCount: number }) | null> => {
    const user = await requireUser();
    if (!UUID_RE.test(id)) return null;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("forms")
      .select(`*, questions(${QUESTION_COLUMNS}), responses(count)`)
      .eq("id", id)
      .eq("owner_id", user.id)
      .order("position", { referencedTable: "questions" })
      .maybeSingle<FormWithQuestions & { responses: { count: number }[] }>();

    if (error) throw new Error(`Could not load form: ${error.message}`);
    if (!data) return null;
    const { responses, questions, settings, ...form } = data;

    const hydratedQuestions = (questions ?? []).map((q) =>
      hydrateQuestion(q, settings?.questionMeta),
    );

    return {
      ...form,
      settings: settings ?? {},
      questions: hydratedQuestions,
      responseCount: responses[0]?.count ?? 0,
    };
  },
);

export type FormListItem = Pick<Form, "id" | "title" | "status" | "slug" | "updated_at"> & {
  responseCount: number;
  questionCount: number;
};

export async function listOwnedForms(): Promise<FormListItem[]> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("forms")
    .select("id, title, status, slug, updated_at, responses(count), questions(count)")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false })
    .returns<
      (Pick<Form, "id" | "title" | "status" | "slug" | "updated_at"> & {
        responses: { count: number }[];
        questions: { count: number }[];
      })[]
    >();

  if (error) throw new Error(`Could not load forms: ${error.message}`);
  return (data ?? []).map(({ responses, questions, ...form }) => ({
    ...form,
    responseCount: responses[0]?.count ?? 0,
    questionCount: questions[0]?.count ?? 0,
  }));
}

/** A published form by its public slug, shaped for the chat widget. Null if missing or unpublished. */
export async function getPublishedForm(slug: string): Promise<ChatFormData | null> {
  if (!/^[a-z0-9]{6,32}$/.test(slug)) return null;
  const supabase = await createPublicClient();
  const { data, error } = await supabase
    .from("forms")
    .select("id, title, slug, settings, questions(id, form_id, type, label, required, options, position)")
    .eq("slug", slug)
    .eq("status", "published")
    .order("position", { referencedTable: "questions" })
    .maybeSingle<{
      id: string;
      title: string;
      slug: string;
      settings: FormSettings;
      questions: Array<Record<string, unknown> & { id: string }>;
    }>();

  if (error) throw new Error(`Could not load form: ${error.message}`);
  if (!data) return null;

  const settings = data.settings ?? {};
  const questions: ChatQuestion[] = (data.questions ?? []).map((q) => {
    const hydrated = hydrateQuestion(q, settings.questionMeta);
    return {
      id: hydrated.id,
      type: hydrated.type,
      label: hydrated.label,
      required: hydrated.required,
      options: hydrated.options,
      logic: hydrated.logic,
      validation: hydrated.validation,
    };
  });

  return {
    title: data.title,
    slug: data.slug,
    settings,
    questions,
  };
}
