export const MAX_PERSONAL_MESSAGE_LENGTH = 160;
export const MAX_RESPONSE_MESSAGE_LENGTH = 280;

function normalizeMessage(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  const normalized = value
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (Array.from(normalized).length > maxLength) return "";
  return normalized;
}

export function normalizePersonalMessage(value: unknown) {
  return normalizeMessage(value, MAX_PERSONAL_MESSAGE_LENGTH);
}

export function normalizeResponseMessage(value: unknown) {
  return normalizeMessage(value, MAX_RESPONSE_MESSAGE_LENGTH);
}
