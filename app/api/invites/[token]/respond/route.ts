import { NextResponse } from "next/server";
import { recordYes } from "@/lib/invites";
import { isSameOrigin } from "@/lib/request-security";
import { normalizeInviteDate } from "@/lib/invite-schedule";
import { normalizeResponseMessage } from "@/lib/invite-message";
import { sendInviteResponseNotification } from "@/lib/telegram";

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 403 });
  }

  const { token } = await context.params;
  let selectedDate: unknown;
  let message: unknown;

  try {
    const body = (await request.json()) as { selectedDate?: unknown; message?: unknown };
    selectedDate = body.selectedDate;
    message = body.message;
  } catch {
    selectedDate = undefined;
    message = undefined;
  }

  if (message !== undefined && typeof message !== "string") {
    return NextResponse.json({ error: "Il messaggio non è valido." }, { status: 400 });
  }

  const normalizedMessage = normalizeResponseMessage(message);
  if (typeof message === "string" && message.trim() && !normalizedMessage) {
    return NextResponse.json({ error: "Il messaggio è troppo lungo." }, { status: 400 });
  }

  const invite = await recordYes(token, selectedDate);
  if (!invite) {
    return NextResponse.json({ error: "Invito o giorno non valido." }, { status: 404 });
  }

  const notification = await sendInviteResponseNotification({
    name: invite.name,
    schedule: invite.schedule,
    selectedDate: normalizeInviteDate(selectedDate) || undefined,
    message: normalizedMessage || undefined,
  });

  if (notification !== "sent") {
    return NextResponse.json(
      { error: "La notifica non è partita. Riprova." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, notification });
}
