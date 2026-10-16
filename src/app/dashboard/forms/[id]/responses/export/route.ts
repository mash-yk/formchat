import { NextResponse } from "next/server";
import { getOwnedForm } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import type { FormResponse } from "@/lib/types";
import { formatAnswer } from "@/lib/validation";

/** Downloads all responses of one of the user's forms as a CSV file (opens in Excel/Sheets). */
export async function GET(_request: Request, ctx: RouteContext<"/dashboard/forms/[id]/responses/export">) {
  const { id } = await ctx.params;
  const form = await getOwnedForm(id); // redirects to /login when signed out
  if (!form) return new NextResponse("Not found", { status: 404 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("responses")
    .select("id, answers, source, submitted_at")
    .eq("form_id", form.id)
    .order("submitted_at", { ascending: false })
    .returns<Pick<FormResponse, "id" | "answers" | "source" | "submitted_at">[]>();
  if (error) return new NextResponse("Could not export responses", { status: 500 });

  // Columns: current questions first, then questions that were deleted since (from snapshots).
  const columns = new Map<string, string>(form.questions.map((q) => [q.id, q.label]));
  for (const r of data)
    for (const a of r.answers) if (!columns.has(a.questionId)) columns.set(a.questionId, a.label);

  const rows = [
    ["Submitted at (UTC)", "Source", ...columns.values()],
    ...data.map((r) => {
      const byId = new Map(r.answers.map((a) => [a.questionId, a]));
      return [
        r.submitted_at,
        r.source === "embed" ? "Website widget" : "Public link",
        ...[...columns.keys()].map((qid) => {
          const a = byId.get(qid);
          return a && a.value ? formatAnswer(a.type, a.value) : "";
        }),
      ];
    }),
  ];

  const csv = UTF8_BOM + rows.map((row) => row.map(toCsvCell).join(",")).join("\r\n");
  const filename = `${
    form.title
      .replace(/[^\w\- ]+/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .toLowerCase() || "form"
  }-responses.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

// Byte-order mark: makes Excel open the file as UTF-8 (emoji, accents, Bangla text).
const UTF8_BOM = "\uFEFF";

function toCsvCell(value: string) {
  // Prevent spreadsheet formula injection (a response like "=HYPERLINK(...)").
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
