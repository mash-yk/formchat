import { NextResponse } from "next/server";
import { getPublishedForm } from "@/lib/forms";
import { resolveSettings } from "@/lib/settings";

const CORS = { "Access-Control-Allow-Origin": "*" };

/**
 * Tiny public config for widget.js (runs on other people's websites): the
 * launcher color, avatar, position, theme and title. 404 when the form is missing or unpublished, so the
 * widget can hide itself instead of showing a broken chat.
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/forms/[slug]/config">) {
  const { slug } = await ctx.params;
  const form = await getPublishedForm(slug);

  if (!form) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404, headers: { ...CORS, "Cache-Control": "no-store" } },
    );
  }

  const settings = resolveSettings(form.settings);

  return NextResponse.json(
    {
      title: form.title,
      primaryColor: settings.primaryColor,
      avatarType: settings.avatarType,
      avatarUrl: settings.avatarUrl,
      botName: settings.botName,
      position: settings.position,
      theme: settings.theme,
    },
    { headers: { ...CORS, "Cache-Control": "no-store" } },
  );
}
