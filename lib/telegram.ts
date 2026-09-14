import "server-only";

import { formatInviteDate, type InviteSchedule } from "@/lib/invite-schedule";

export type TelegramNotificationStatus = "sent" | "unconfigured" | "failed";

export async function sendInviteResponseNotification({
  name,
  schedule,
  selectedDate,
}: {
  name: string;
  schedule?: InviteSchedule;
  selectedDate?: string;
}): Promise<TelegramNotificationStatus> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return "unconfigured";

  const date = selectedDate ? formatInviteDate(selectedDate) : undefined;
  const action = schedule?.mode === "range" ? "ha scelto" : "ha confermato";
  const text = date
    ? `📅 Nuova risposta\n${name} ${action}: ${date}.`
    : `📅 Nuova risposta\n${name} ha confermato l’invito.`;

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
      cache: "no-store",
      signal: AbortSignal.timeout(6_000),
    });

    return response.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
}
