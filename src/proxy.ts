import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Next.js 16 renamed middleware.ts → proxy.ts. It runs before every matched request.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Skip static assets, images and public routes that never need a login session
    // (widget script, embed iframe, public form links, widget API).
    "/((?!_next/static|_next/image|favicon.ico|widget.js|embed/|f/|api/forms/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
