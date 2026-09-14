export const MAX_PERSONAL_MESSAGE_LENGTH = 160;

export function normalizePersonalMessage(value: unknown) {
  if (typeof value !== "string") return "";
  const normalized = value
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (Array.from(normalized).length > MAX_PERSONAL_MESSAGE_LENGTH) return "";
  return normalized;
}
