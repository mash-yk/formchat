import { NextResponse } from "next/server";
import { buildCsvFilename, buildResponsesCsv } from "@/lib/export";
import { getOwnedForm } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import type { FormResponse } from "@/lib/types";

/** Downloads all responses of one of the user's forms as a CSV file (opens in Excel/Sheets). */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/dashboard/forms/[id]/responses/export">,
) {
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

  const csv = buildResponsesCsv(form.questions, data ?? []);
  const filename = buildCsvFilename(form.title);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
