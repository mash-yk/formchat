import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AnswerSnapshot, ChatQuestion } from "@/lib/types";
import { submissionSchema, validateAnswers } from "@/lib/validation";

const MAX_BODY_BYTES = 64_000;
const NOT_ACCEPTING = "This form isn’t accepting responses right now.";

const json = (body: unknown, status: number) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

/**
 * Public endpoint the chat widget posts to. The browser is never trusted:
 * the form is re-loaded here, every answer is re-validated against the saved
 * questions, and only then is the response inserted (with the server-only key).
 */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/forms/[slug]/responses">) {
  const { slug } = await ctx.params;

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

  const supabase = createAdminClient();
  const { data: form, error } = await supabase
    .from("forms")
    .select("id, status, questions(id, type, label, required, options, position)")
    .eq("slug", slug)
    .order("position", { referencedTable: "questions" })
    .maybeSingle<{ id: string; status: string; questions: ChatQuestion[] }>();

  if (error) {
    console.error("Failed to load form for submission", error);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
  if (!form || form.status !== "published" || form.questions.length === 0) {
    return json({ error: NOT_ACCEPTING }, 404);
  }

  // Honeypot filled in → almost certainly a bot. Pretend it worked, store nothing.
  if (parsed.data.website) return json({ ok: true }, 201);

  const result = validateAnswers(form.questions, parsed.data.answers);
  if (!result.ok) {
    return json(
      { error: "Some answers are invalid. Please check and try again.", fieldErrors: result.errors },
      422,
    );
  }

  // Snapshot labels/types so this response stays readable even if the form is edited later.
  const answers: AnswerSnapshot[] = form.questions.map((q) => ({
    questionId: q.id,
    label: q.label,
    type: q.type,
    value: result.values[q.id] ?? "",
  }));

  const { error: insertError } = await supabase
    .from("responses")
    .insert({ form_id: form.id, answers, source: parsed.data.source });

  if (insertError) {
    console.error("Failed to save response", insertError);
    return json({ error: "We couldn’t save your response. Please try again." }, 500);
  }
  return json({ ok: true }, 201);
}
