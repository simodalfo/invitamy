import { NextResponse } from "next/server";
import { recordYes } from "@/lib/invites";
import { isSameOrigin } from "@/lib/request-security";

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 403 });
  }

  const { token } = await context.params;
  const updated = await recordYes(token);
  return updated
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "Invito non trovato." }, { status: 404 });
}
