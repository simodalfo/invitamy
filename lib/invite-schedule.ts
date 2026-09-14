export const MAX_INVITE_RANGE_DAYS = 7;

export type InviteSchedule =
  | { mode: "single"; date: string }
  | { mode: "range"; startDate: string; endDate: string; recommendedDates?: string[] };

const isoDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/;

function dateValue(value: string) {
  const match = isoDatePattern.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day, 12));

  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

export function normalizeInviteDate(value: unknown) {
  if (typeof value !== "string") return "";
  const normalized = value.trim();
  return dateValue(normalized) ? normalized : "";
}

export function normalizeInviteSchedule(value: unknown): InviteSchedule | undefined {
  if (!value || typeof value !== "object") return undefined;

  const schedule = value as {
    mode?: unknown;
    date?: unknown;
    startDate?: unknown;
    endDate?: unknown;
    recommendedDates?: unknown;
  };

  if (schedule.mode === "single") {
    const date = normalizeInviteDate(schedule.date);
    return date ? { mode: "single", date } : undefined;
  }

  if (schedule.mode === "range") {
    const startDate = normalizeInviteDate(schedule.startDate);
    const endDate = normalizeInviteDate(schedule.endDate);
    if (!startDate || !endDate || endDate <= startDate) return undefined;

    const start = dateValue(startDate);
    const end = dateValue(endDate);
    if (!start || !end) return undefined;

    const inclusiveDays = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
    if (inclusiveDays > MAX_INVITE_RANGE_DAYS) return undefined;

    const recommendedDates = Array.isArray(schedule.recommendedDates)
      ? Array.from(new Set(
          schedule.recommendedDates
            .map(normalizeInviteDate)
            .filter((date) => date >= startDate && date <= endDate),
        )).sort()
      : [];

    return {
      mode: "range",
      startDate,
      endDate,
      ...(recommendedDates.length ? { recommendedDates } : {}),
    };
  }

  return undefined;
}

export function inviteScheduleDates(schedule: InviteSchedule) {
  if (schedule.mode === "single") return [schedule.date];

  const start = dateValue(schedule.startDate);
  if (!start) return [];

  const dates: string[] = [];
  for (let offset = 0; offset < MAX_INVITE_RANGE_DAYS; offset += 1) {
    const date = new Date(start.getTime() + offset * 86_400_000);
    const value = date.toISOString().slice(0, 10);
    dates.push(value);
    if (value === schedule.endDate) break;
  }

  return dates;
}

const longDateFormatter = new Intl.DateTimeFormat("it-IT", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

const weekdayFormatter = new Intl.DateTimeFormat("it-IT", {
  weekday: "long",
  timeZone: "UTC",
});

const dayMonthFormatter = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

function formatDate(value: string, formatter: Intl.DateTimeFormat) {
  const date = dateValue(value);
  return date ? formatter.format(date) : value;
}

export function formatInviteDate(value: string) {
  return formatDate(value, longDateFormatter);
}

export function formatInviteWeekday(value: string) {
  return formatDate(value, weekdayFormatter);
}

export function formatInviteDayMonth(value: string) {
  return formatDate(value, dayMonthFormatter);
}

export function scheduleIncludesDate(schedule: InviteSchedule, value: unknown) {
  const date = normalizeInviteDate(value);
  if (!date) return false;
  if (schedule.mode === "single") return date === schedule.date;
  return date >= schedule.startDate && date <= schedule.endDate;
}
