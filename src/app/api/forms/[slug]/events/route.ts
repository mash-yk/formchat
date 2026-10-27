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
    // ignore — default to "view"
  }

  const eventType = body.type === "start" ? "start" : "view";

  const supabase = createAdminClient();
  const { data: form } = await supabase
    .from("forms")
    .select("id")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (form) {
    // Write to in-memory store (used by analytics computation engine)
    recordFormEvent(form.id, eventType);

    // Persist to DB so events survive server restarts and scale across instances
    await supabase
      .from("form_events")
      .insert({ form_id: form.id, event_type: eventType })
      .then(({ error }) => {
        if (error) {
          // Non-fatal: in-memory fallback already recorded the event
          console.warn("[events] Failed to persist event to DB:", error.message);
        }
      });
  }

  return NextResponse.json({ ok: true }, { headers: CORS });
}
