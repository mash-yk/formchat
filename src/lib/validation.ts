import { z } from "zod";
import { isQuestionConditionMet } from "./conditional";
import {
  QUESTION_TYPES,
  type ChatQuestion,
  type QuestionType,
} from "./types";

/**
 * Validation shared by the builder (client), Server Actions, the chat widget
 * and the submit API — one source of truth for every rule.
 */

export const LIMITS = {
  title: 120,
  description: 500,
  label: 300,
  option: 100,
  options: 20,
  questions: 50,
  answer: 10000,
  message: 300,
  botName: 50,
  maxFileSizeMB: 10,
} as const;

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  text: "Text",
  email: "Email",
  multiple_choice: "Multiple choice",
  yes_no: "Yes / No",
  dropdown: "Dropdown",
  rating: "Rating",
  date: "Date",
  file: "File upload",
};

export const conditionalLogicSchema = z
  .object({
    dependsOn: z.string(),
    operator: z.enum(["equals", "not_equals", "contains", "is_answered"]),
    value: z.string().optional(),
  })
  .nullable()
  .optional();

export const questionValidationSchema = z
  .object({
    minLength: z.number().int().min(0).optional(),
    maxLength: z.number().int().min(1).optional(),
    minRating: z.number().int().min(1).optional(),
    maxRating: z.number().int().min(2).max(10).optional(),
    allowPast: z.boolean().optional(),
    allowFuture: z.boolean().optional(),
    maxFileSizeMB: z.number().min(0.1).max(50).optional(),
    acceptedTypes: z.string().optional(),
  })
  .nullable()
  .optional();

// ─── Builder ────────────────────────────────────────────────────────────────

export const questionDraftSchema = z
  .object({
    id: z.string(),
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
    logic: conditionalLogicSchema,
    validation: questionValidationSchema,
  })
  .superRefine((q, ctx) => {
    if (q.type === "multiple_choice" || q.type === "dropdown") {
      const options = q.options ?? [];
      if (options.length < 2) {
        ctx.addIssue({ code: "custom", path: ["options"], message: "Add at least 2 options" });
      }
      const normalized = options.map((o) => o.toLowerCase());
      if (new Set(normalized).size !== normalized.length) {
        ctx.addIssue({ code: "custom", path: ["options"], message: "Options must be different" });
      }
    }
  })
  .transform((q) => ({
    ...q,
    options:
      q.type === "multiple_choice" || q.type === "dropdown"
        ? q.options
        : null,
  }));

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
  primaryColor: z.string().regex(HEX_COLOR, "Pick a valid color like #4f46e5").optional(),
  welcomeMessage: z
    .string()
    .trim()
    .max(LIMITS.message, `Keep it under ${LIMITS.message} characters`)
    .optional(),
  completionMessage: z
    .string()
    .trim()
    .max(LIMITS.message, `Keep it under ${LIMITS.message} characters`)
    .optional(),
  redirectUrl: z
    .string()
    .trim()
    .refine((val) => !val || /^https?:\/\/.+/i.test(val), "Must be a valid URL (https://...)")
    .optional(),
  avatarType: z.enum(["bot", "sparkles", "agent", "smile", "custom"]).optional(),
  avatarUrl: z.string().trim().optional(),
  botName: z.string().trim().max(LIMITS.botName, `Keep it under ${LIMITS.botName} characters`).optional(),
  position: z.enum(["right", "left"]).optional(),
  theme: z.enum(["light", "dark", "auto"]).optional(),
  notifyEmail: z
    .string()
    .trim()
    .refine((val) => !val || z.string().email().safeParse(val).success, "Enter a valid email address")
    .optional(),
  notifyEnabled: z.boolean().optional(),
  webhookUrl: z
    .string()
    .trim()
    .refine((val) => !val || /^https?:\/\/.+/i.test(val), "Must be a valid webhook URL (https://...)")
    .optional(),
  webhookSecret: z.string().trim().max(100).optional(),
  webhookEnabled: z.boolean().optional(),
  questionMeta: z.record(z.string(), z.any()).optional(),
});

// ─── Answers (chat widget + submit API) ─────────────────────────────────────

type AnswerResult = { ok: true; value: string } | { ok: false; error: string };

const emailSchema = z.string().email();

export function validateAnswer(
  question: Pick<ChatQuestion, "type" | "required" | "options" | "validation">,
  raw: unknown,
): AnswerResult {
  if (raw !== undefined && raw !== null && typeof raw !== "string") {
    // If it's a file object JSON
    if (typeof raw === "object") {
      try {
        const fileObj = raw as { name?: string; size?: number; type?: string; dataUrl?: string };
        if (fileObj.name) {
          const maxMB = question.validation?.maxFileSizeMB ?? LIMITS.maxFileSizeMB;
          if (fileObj.size && fileObj.size > maxMB * 1024 * 1024) {
            return { ok: false, error: `File is too large. Max size is ${maxMB} MB.` };
          }
          return { ok: true, value: JSON.stringify(fileObj) };
        }
      } catch {
        return { ok: false, error: "Invalid file data" };
      }
    }
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
      return value.toLowerCase() === "yes" || value.toLowerCase() === "no"
        ? { ok: true, value: value.toLowerCase() }
        : { ok: false, error: "Please answer yes or no" };
    case "multiple_choice":
    case "dropdown":
      return question.options?.includes(value)
        ? { ok: true, value }
        : { ok: false, error: "Please choose one of the options" };
    case "rating": {
      const num = Number(value);
      const min = question.validation?.minRating ?? 1;
      const max = question.validation?.maxRating ?? 5;
      if (!Number.isInteger(num) || num < min || num > max) {
        return { ok: false, error: `Please choose a rating between ${min} and ${max}` };
      }
      return { ok: true, value: String(num) };
    }
    case "date": {
      // YYYY-MM-DD
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(value)) {
        return { ok: false, error: "Please enter a valid date (YYYY-MM-DD)" };
      }
      const parsedDate = new Date(value);
      if (isNaN(parsedDate.getTime())) {
        return { ok: false, error: "Please enter a valid date" };
      }
      const today = new Date().toISOString().slice(0, 10);
      if (question.validation?.allowPast === false && value < today) {
        return { ok: false, error: "Date must not be in the past" };
      }
      if (question.validation?.allowFuture === false && value > today) {
        return { ok: false, error: "Date must not be in the future" };
      }
      return { ok: true, value };
    }
    case "file": {
      // File could be JSON string or URL
      try {
        const parsed = JSON.parse(value);
        if (parsed.name) {
          const maxMB = question.validation?.maxFileSizeMB ?? LIMITS.maxFileSizeMB;
          if (parsed.size && parsed.size > maxMB * 1024 * 1024) {
            return { ok: false, error: `File is too large (max ${maxMB} MB)` };
          }
        }
      } catch {
        // regular text / url string is acceptable
      }
      return { ok: true, value };
    }
    case "text": {
      if (question.validation?.minLength && value.length < question.validation.minLength) {
        return {
          ok: false,
          error: `Must be at least ${question.validation.minLength} characters`,
        };
      }
      if (question.validation?.maxLength && value.length > question.validation.maxLength) {
        return {
          ok: false,
          error: `Must be at most ${question.validation.maxLength} characters`,
        };
      }
      return { ok: true, value };
    }
    default:
      return { ok: true, value };
  }
}

/** Validates every active answer according to conditional logic; returns cleaned values or per-question errors. */
export function validateAnswers(
  questions: ChatQuestion[],
  input: Record<string, unknown>,
): { ok: true; values: Record<string, string> } | { ok: false; errors: Record<string, string> } {
  const values: Record<string, string> = {};
  const errors: Record<string, string> = {};

  // First convert raw inputs to normalized strings so conditional logic can evaluate them
  const rawAnswers: Record<string, string> = {};
  for (const q of questions) {
    const raw = input[q.id];
    if (typeof raw === "string") rawAnswers[q.id] = raw;
    else if (raw && typeof raw === "object") rawAnswers[q.id] = JSON.stringify(raw);
    else rawAnswers[q.id] = "";
  }

  for (const q of questions) {
    // If question is hidden by conditional logic, it doesn't need to be answered or validated
    if (!isQuestionConditionMet(q.logic, rawAnswers)) {
      continue;
    }
    const result = validateAnswer(q, input[q.id]);
    if (result.ok) values[q.id] = result.value;
    else errors[q.id] = result.error;
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, values };
}

export function formatAnswer(type: QuestionType, value: string): string {
  if (!value) return "—";
  if (type === "yes_no") return value.toLowerCase() === "yes" ? "Yes" : "No";
  if (type === "rating") {
    const n = Number(value);
    if (!isNaN(n)) {
      return `${"★".repeat(n)} (${n})`;
    }
    return value;
  }
  if (type === "file") {
    try {
      const parsed = JSON.parse(value);
      if (parsed.name) {
        const sizeKb = parsed.size ? ` (${Math.round(parsed.size / 1024)} KB)` : "";
        return `📎 ${parsed.name}${sizeKb}`;
      }
    } catch {
      // not JSON
    }
    return value.length > 60 ? `${value.slice(0, 57)}…` : value;
  }
  if (type === "date") {
    try {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
      }
    } catch {
      // ignore
    }
    return value;
  }
  return value;
}

export const submissionSchema = z.object({
  answers: z.record(z.string(), z.unknown()),
  source: z.enum(["link", "embed"]).default("link"),
  website: z.string().optional(), // honeypot
  startedAt: z.number().optional(), // timestamp when respondent began form (timing protection)
});
