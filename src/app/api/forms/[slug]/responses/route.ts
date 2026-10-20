import { NextResponse, type NextRequest } from "next/server";
import { isUserSuspended, recordAuditLog } from "@/lib/admin";
import { sendNotificationEmail, triggerWebhook } from "@/lib/integrations";
import { checkRateLimit, isSpamSubmission } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  AnswerSnapshot,
  ChatQuestion,
  ConditionalLogic,
  FormSettings,
  QuestionType,
  QuestionValidation,
} from "@/lib/types";
import { submissionSchema, validateAnswers } from "@/lib/validation";

const MAX_BODY_BYTES = 64_000;
const NOT_ACCEPTING = "This form isn’t accepting responses right now.";

const json = (body: unknown, status: number, headers?: Record<string, string>) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...(headers ?? {}) },
  });

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "127.0.0.1";
}

/**
 * Public endpoint the chat widget posts to. The browser is never trusted:
 * the form is re-loaded here, every answer is re-validated against the saved
 * questions, and only then is the response inserted (with the server-only key).
 */
export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/forms/[slug]/responses">,
) {
  const { slug } = await ctx.params;

  // 1. Rate Limiting Check
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(clientIp, 15, 60 * 1000);
  if (!rateLimit.allowed) {
    return json(
      { error: "Too many requests. Please wait a moment before submitting again." },
      429,
      { "Retry-After": String(rateLimit.resetSeconds) },
    );
  }

  // 2. Body length and content type checks
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return json({ error: "Expected JSON" }, 415);
  }
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return json({ error: "Your answers are too long." }, 413);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  const parsed = submissionSchema.safeParse(body);
  if (!parsed.success) return json({ error: "Invalid request body" }, 400);

  if (!/^[a-z0-9]{6,32}$/.test(slug)) return json({ error: NOT_ACCEPTING }, 404);

  // 3. Spam / Bot detection (honeypot + speed check)
  if (isSpamSubmission(parsed.data.website, parsed.data.startedAt)) {
    // Pretend it succeeded, store nothing
    return json({ ok: true }, 201);
  }

  const supabase = createAdminClient();
  const { data: form, error } = await supabase
    .from("forms")
    .select("id, owner_id, title, status, settings, questions(id, type, label, required, options, position, logic, validation)")
    .eq("slug", slug)
    .order("position", { referencedTable: "questions" })
    .maybeSingle<{
      id: string;
      owner_id: string;
      title: string;
      status: string;
      settings: FormSettings;
      questions: Array<{
        id: string;
        type: string;
        label: string;
        required: boolean;
        options?: string[] | null;
        position?: number;
        logic?: ConditionalLogic | null;
        validation?: QuestionValidation | null;
      }>;
    }>();

  if (error) {
    console.error("Failed to load form for submission", error);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
  if (!form || form.status !== "published" || form.questions.length === 0) {
    return json({ error: NOT_ACCEPTING }, 404);
  }

  // Check if form owner's account has been suspended by an administrator
  if (isUserSuspended(form.owner_id)) {
    return json({ error: "This form is unavailable because the account has been suspended." }, 403);
  }

  const settings = (form.settings ?? {}) as FormSettings;
  const questionMeta = settings.questionMeta ?? {};

  // Hydrate questions with extended metadata (types, logic, validation)
  const hydratedQuestions: ChatQuestion[] = form.questions.map((q) => {
    const meta = questionMeta[q.id];
    return {
      id: q.id,
      type: (meta?.type || q.type) as QuestionType,
      label: q.label,
      required: Boolean(q.required),
      options: meta?.options ?? q.options ?? null,
      logic: meta?.logic ?? q.logic ?? null,
      validation: meta?.validation ?? q.validation ?? null,
    };
  });

  // 4. Validate answers against conditional logic and question constraints
  const result = validateAnswers(hydratedQuestions, parsed.data.answers);
  if (!result.ok) {
    return json(
      { error: "Some answers are invalid. Please check and try again.", fieldErrors: result.errors },
      422,
    );
  }

  // Snapshot labels/types so this response stays readable even if the form is edited later.
  const answers: AnswerSnapshot[] = hydratedQuestions
    .filter((q) => q.id in result.values)
    .map((q) => ({
      questionId: q.id,
      label: q.label,
      type: q.type,
      value: result.values[q.id] ?? "",
    }));

  const { data: insertedResponse, error: insertError } = await supabase
    .from("responses")
    .insert({ form_id: form.id, answers, source: parsed.data.source })
    .select("id, submitted_at")
    .single();

  if (insertError) {
    console.error("Failed to save response", insertError);
    return json({ error: "We couldn’t save your response. Please try again." }, 500);
  }

  recordAuditLog({
    type: "response_submit",
    description: `Response received for form "${form.title}" (${parsed.data.source})`,
    formId: form.id,
    userId: form.owner_id,
  });

  // 5. Notifications & Webhook Integrations (async fire-and-forget or background)
  const submittedAt = insertedResponse?.submitted_at ?? new Date().toISOString();

  if (settings.webhookEnabled && settings.webhookUrl) {
    void triggerWebhook({
      formId: form.id,
      formTitle: form.title,
      slug,
      url: settings.webhookUrl,
      secret: settings.webhookSecret,
      response: {
        id: insertedResponse?.id ?? crypto.randomUUID(),
        source: parsed.data.source,
        submittedAt,
        answers,
      },
    });
  }

  if (settings.notifyEnabled && settings.notifyEmail) {
    void sendNotificationEmail({
      recipientEmail: settings.notifyEmail,
      formTitle: form.title,
      formSlug: slug,
      answers,
      source: parsed.data.source,
      submittedAt,
    });
  }

  return json({ ok: true, redirectUrl: settings.redirectUrl || undefined }, 201);
}
