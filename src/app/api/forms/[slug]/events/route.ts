import { NextResponse, type NextRequest } from "next/server";
import { recordFormEvent } from "@/lib/analytics";
import { createAdminClient } from "@/lib/supabase/admin";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS });
}

export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/forms/[slug]/events">,
) {
  const { slug } = await ctx.params;

  if (!/^[a-z0-9]{6,32}$/.test(slug)) {
    return NextResponse.json({ error: "Invalid form" }, { status: 400, headers: CORS });
  }

  let body: { type?: string } = {};
  try {
    body = await request.json();
  } catch {
    // ignore
  }

  const eventType = body.type === "start" ? "start" : "view";

  const supabase = createAdminClient();
  const { data: form } = await supabase
    .from("forms")
    .select("id")
    .eq("slug", slug)
    .single();

  if (form) {
    recordFormEvent(form.id, eventType);
  }

  return NextResponse.json({ ok: true }, { headers: CORS });
}
