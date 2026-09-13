import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export type Invite = {
  token: string;
  name: string;
  createdAt: string;
};

const TOKEN_VERSION = 1;
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function encryptionKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET deve contenere almeno 32 caratteri.");
  }

  return createHash("sha256").update(`invito:${secret}`).digest();
}

export function normalizeName(value: unknown) {
  if (typeof value !== "string") return "";
  return Array.from(value.trim().replace(/\s+/g, " ")).slice(0, 40).join("");
}

export async function createInvite(name: string): Promise<Invite> {
  const createdAt = new Date().toISOString();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const plaintext = Buffer.from(JSON.stringify({ name, createdAt }), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const token = Buffer.concat([Buffer.from([TOKEN_VERSION]), iv, authTag, encrypted]).toString("base64url");

  return { token, name, createdAt };
}

export async function getInvite(token: string): Promise<Invite | null> {
  if (!/^[a-zA-Z0-9_-]{48,300}$/.test(token)) return null;

  try {
    const packed = Buffer.from(token, "base64url");
    if (packed[0] !== TOKEN_VERSION || packed.length <= 1 + IV_LENGTH + AUTH_TAG_LENGTH) return null;

    const iv = packed.subarray(1, 1 + IV_LENGTH);
    const authTag = packed.subarray(1 + IV_LENGTH, 1 + IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = packed.subarray(1 + IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
    const parsed = JSON.parse(plaintext) as { name?: unknown; createdAt?: unknown };
    const name = normalizeName(parsed.name);

    if (!name || typeof parsed.createdAt !== "string") return null;
    return { token, name, createdAt: parsed.createdAt };
  } catch {
    return null;
  }
}

export async function markInviteOpened(token: string) {
  return Boolean(await getInvite(token));
}

export async function recordYes(token: string) {
  return Boolean(await getInvite(token));
}
