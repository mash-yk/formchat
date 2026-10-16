import { z } from "zod";
import { QUESTION_TYPES, type ChatQuestion, type QuestionType } from "./types";

/**
 * Validation shared by the builder (client), Server Actions, the chat widget
 * and the submit API — one source of truth for every rule.
 */

export const LIMITS = {
  title: 120,
  description: 500,
  label: 300,
  option: 100,
  options: 10,
  questions: 50,
  answer: 2000,
  message: 300,
} as const;

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  text: "Text",
  email: "Email",
  multiple_choice: "Multiple choice",
  yes_no: "Yes / No",
};

// ─── Builder ────────────────────────────────────────────────────────────────

export const questionDraftSchema = z
  .object({
    id: z.uuid(),
    type: z.enum(QUESTION_TYPES),
    label: z
      .string()
      .trim()
      .min(1, "Write the question")
      .max(LIMITS.label, `Keep questions under ${LIMITS.label} characters`),
    required: z.boolean(),
    options: z
      .array(
        z
          .string()
          .trim()
          .min(1, "Options can't be empty")
          .max(LIMITS.option, `Keep options under ${LIMITS.option} characters`),
      )
      .max(LIMITS.options, `Use at most ${LIMITS.options} options`)
      .nullable(),
  })
  .superRefine((q, ctx) => {
    if (q.type !== "multiple_choice") return;
    const options = q.options ?? [];
    if (options.length < 2) {
      ctx.addIssue({ code: "custom", path: ["options"], message: "Add at least 2 options" });
    }
    const normalized = options.map((o) => o.toLowerCase());
    if (new Set(normalized).size !== normalized.length) {
      ctx.addIssue({ code: "custom", path: ["options"], message: "Options must be different" });
    }
  })
  .transform((q) => ({ ...q, options: q.type === "multiple_choice" ? q.options : null }));

export const formDraftSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Give your form a title")
    .max(LIMITS.title, `Keep the title under ${LIMITS.title} characters`),
  description: z
    .string()
    .trim()
    .max(LIMITS.description, `Keep the description under ${LIMITS.description} characters`),
  questions: z
    .array(questionDraftSchema)
    .max(LIMITS.questions, `A form can have at most ${LIMITS.questions} questions`),
});

export type FormDraft = z.input<typeof formDraftSchema>;

/** Flattens Zod issues into `{ "questions.2.label": "message" }` for easy lookup in the UI. */
export function issuesByPath(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

// ─── Widget customization ───────────────────────────────────────────────────

export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export const settingsSchema = z.object({
  primaryColor: z.string().regex(HEX_COLOR, "Pick a valid color like #4f46e5"),
  welcomeMessage: z.string().trim().max(LIMITS.message, `Keep it under ${LIMITS.message} characters`),
  completionMessage: z.string().trim().max(LIMITS.message, `Keep it under ${LIMITS.message} characters`),
});

// ─── Answers (chat widget + submit API) ─────────────────────────────────────

type AnswerResult = { ok: true; value: string } | { ok: false; error: string };

const emailSchema = z.email();

export function validateAnswer(
  question: Pick<ChatQuestion, "type" | "required" | "options">,
  raw: unknown,
): AnswerResult {
  if (raw !== undefined && raw !== null && typeof raw !== "string") {
    return { ok: false, error: "Invalid answer" };
  }
  const value = (raw ?? "").trim();

  if (value === "") {
    return question.required ? { ok: false, error: "This question is required" } : { ok: true, value: "" };
  }
  if (value.length > LIMITS.answer) {
    return { ok: false, error: `Please keep it under ${LIMITS.answer} characters` };
  }

  switch (question.type) {
    case "email":
      return emailSchema.safeParse(value).success
        ? { ok: true, value }
        : { ok: false, error: "Please enter a valid email address" };
    case "yes_no":
      return value === "yes" || value === "no"
        ? { ok: true, value }
        : { ok: false, error: "Please answer yes or no" };
    case "multiple_choice":
      return question.options?.includes(value)
        ? { ok: true, value }
        : { ok: false, error: "Please choose one of the options" };
    default:
      return { ok: true, value };
  }
}

/** Validates every answer; returns cleaned values or per-question errors. */
export function validateAnswers(
  questions: ChatQuestion[],
  input: Record<string, unknown>,
): { ok: true; values: Record<string, string> } | { ok: false; errors: Record<string, string> } {
  const values: Record<string, string> = {};
  const errors: Record<string, string> = {};
  for (const q of questions) {
    const result = validateAnswer(q, input[q.id]);
    if (result.ok) values[q.id] = result.value;
    else errors[q.id] = result.error;
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, values };
}

export function formatAnswer(type: QuestionType, value: string) {
  if (!value) return "—";
  if (type === "yes_no") return value === "yes" ? "Yes" : "No";
  return value;
}

export const submissionSchema = z.object({
  answers: z.record(z.string(), z.unknown()),
  source: z.enum(["link", "embed"]).default("link"),
  website: z.string().optional(), // honeypot: real people never fill this in
});
