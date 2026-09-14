import { NextResponse } from "next/server";
import { recordYes } from "@/lib/invites";
import { isSameOrigin } from "@/lib/request-security";
import { normalizeInviteDate } from "@/lib/invite-schedule";
import { sendInviteResponseNotification } from "@/lib/telegram";

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 403 });
  }

  const { token } = await context.params;
  let selectedDate: unknown;

  try {
    const body = (await request.json()) as { selectedDate?: unknown };
    selectedDate = body.selectedDate;
  } catch {
    selectedDate = undefined;
  }

  const invite = await recordYes(token, selectedDate);
  if (!invite) {
    return NextResponse.json({ error: "Invito o giorno non valido." }, { status: 404 });
  }

  const notification = await sendInviteResponseNotification({
    name: invite.name,
    schedule: invite.schedule,
    selectedDate: normalizeInviteDate(selectedDate) || undefined,
  });

  if (notification !== "sent") {
    return NextResponse.json(
      { error: "La notifica non è partita. Riprova." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, notification });
}
