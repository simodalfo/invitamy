import { NextResponse } from "next/server";
import { createSessionToken, passwordIsValid, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { isSameOrigin } from "@/lib/request-security";

type Attempt = { count: number; resetAt: number };
const attempts = new Map<string, Attempt>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function clientKey(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Richiesta non valida. Ricarica la pagina e riprova." }, { status: 403 });
  }

  const key = clientKey(request);
  const now = Date.now();
  const current = attempts.get(key);

  if (current && current.resetAt > now && current.count >= MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: "Troppi tentativi. Aspetta dieci minuti prima di riprovare." },
      { status: 429 },
    );
  }

  try {
    const body = (await request.json()) as { password?: unknown };
    const password = typeof body.password === "string" ? body.password : "";

    if (!passwordIsValid(password)) {
      attempts.set(key, {
        count: current && current.resetAt > now ? current.count + 1 : 1,
        resetAt: current && current.resetAt > now ? current.resetAt : now + WINDOW_MS,
      });

      return NextResponse.json({ error: "Password non corretta. Riprova." }, { status: 401 });
    }

    attempts.delete(key);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, createSessionToken(), sessionCookieOptions);
    return response;
  } catch (error) {
    const message = error instanceof Error && error.message.includes("ADMIN_PASSWORD")
      ? "Configura la password amministratore prima di accedere."
      : "Non siamo riusciti ad accedere. Riprova tra poco.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
