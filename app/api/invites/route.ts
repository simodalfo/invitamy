import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import {
  createInvite,
  normalizeBackgroundPath,
  normalizeBackgroundTone,
  normalizeName,
} from "@/lib/invites";
import { isSameOrigin } from "@/lib/request-security";
import { normalizeInviteSchedule } from "@/lib/invite-schedule";
import { normalizePersonalMessage } from "@/lib/invite-message";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Richiesta non valida. Ricarica la pagina e riprova." }, { status: 403 });
  }

  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "La sessione è scaduta. Accedi di nuovo." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      name?: unknown;
      backgroundPath?: unknown;
      backgroundTone?: unknown;
      schedule?: unknown;
      message?: unknown;
    };
    const name = normalizeName(body.name);
    const backgroundPath = normalizeBackgroundPath(body.backgroundPath);
    const backgroundTone = normalizeBackgroundTone(body.backgroundTone);
    const schedule = normalizeInviteSchedule(body.schedule);
    const message = normalizePersonalMessage(body.message);

    if (!name) {
      return NextResponse.json({ error: "Inserisci il nome della persona da invitare." }, { status: 400 });
    }

    if (typeof body.message === "string" && body.message.trim() && !message) {
      return NextResponse.json({ error: "Il messaggio personale è troppo lungo." }, { status: 400 });
    }

    if ((backgroundPath && !backgroundTone) || (!backgroundPath && backgroundTone)) {
      return NextResponse.json({ error: "La foto personalizzata non è valida. Selezionala di nuovo." }, { status: 400 });
    }

    if (!schedule) {
      return NextResponse.json({ error: "Scegli un giorno oppure un periodo fino a sette giorni." }, { status: 400 });
    }

    const invite = await createInvite(
      name,
      {
        background: backgroundPath && backgroundTone
          ? { path: backgroundPath, tone: backgroundTone }
          : undefined,
        schedule,
        message: message || undefined,
      },
    );
    const url = new URL(`/i/${invite.token}`, request.url).toString();
    return NextResponse.json({ url, name: invite.name });
  } catch {
    return NextResponse.json(
      { error: "Non siamo riusciti a creare il link. Riprova tra poco." },
      { status: 500 },
    );
  }
}
