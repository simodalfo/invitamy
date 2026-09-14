import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import {
  type InviteSchedule,
  normalizeInviteSchedule,
  scheduleIncludesDate,
} from "@/lib/invite-schedule";

export type Invite = {
  token: string;
  name: string;
  createdAt: string;
  schedule?: InviteSchedule;
  backgroundPath?: string;
  backgroundTone?: BackgroundTone;
};

export type BackgroundTone = "light" | "dark";

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

export function normalizeBackgroundPath(value: unknown) {
  if (typeof value !== "string") return "";
  const path = value.trim();
  if (!/^invitamy\/[a-zA-Z0-9._/-]{1,240}$/.test(path) || path.includes("..")) return "";
  return path;
}

export function normalizeBackgroundTone(value: unknown): BackgroundTone | undefined {
  return value === "light" || value === "dark" ? value : undefined;
}

export async function createInvite(
  name: string,
  options: {
    background?: { path: string; tone: BackgroundTone };
    schedule?: InviteSchedule;
  } = {},
): Promise<Invite> {
  const createdAt = new Date().toISOString();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const payload = {
    name,
    createdAt,
    ...(options.background
      ? { backgroundPath: options.background.path, backgroundTone: options.background.tone }
      : {}),
    ...(options.schedule ? { schedule: options.schedule } : {}),
  };
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const token = Buffer.concat([Buffer.from([TOKEN_VERSION]), iv, authTag, encrypted]).toString("base64url");

  return { token, ...payload };
}

export async function getInvite(token: string): Promise<Invite | null> {
  if (!/^[a-zA-Z0-9_-]{48,1024}$/.test(token)) return null;

  try {
    const packed = Buffer.from(token, "base64url");
    if (packed[0] !== TOKEN_VERSION || packed.length <= 1 + IV_LENGTH + AUTH_TAG_LENGTH) return null;

    const iv = packed.subarray(1, 1 + IV_LENGTH);
    const authTag = packed.subarray(1 + IV_LENGTH, 1 + IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = packed.subarray(1 + IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
    const parsed = JSON.parse(plaintext) as {
      name?: unknown;
      createdAt?: unknown;
      backgroundPath?: unknown;
      backgroundTone?: unknown;
      schedule?: unknown;
    };
    const name = normalizeName(parsed.name);
    const backgroundPath = normalizeBackgroundPath(parsed.backgroundPath);
    const backgroundTone = normalizeBackgroundTone(parsed.backgroundTone);
    const schedule = normalizeInviteSchedule(parsed.schedule);

    if (!name || typeof parsed.createdAt !== "string") return null;
    return {
      token,
      name,
      createdAt: parsed.createdAt,
      ...(backgroundPath && backgroundTone ? { backgroundPath, backgroundTone } : {}),
      ...(schedule ? { schedule } : {}),
    };
  } catch {
    return null;
  }
}

export async function markInviteOpened(token: string) {
  return Boolean(await getInvite(token));
}

export async function recordYes(token: string, selectedDate?: unknown) {
  const invite = await getInvite(token);
  if (!invite) return null;
  if (!invite.schedule) return invite;
  return scheduleIncludesDate(invite.schedule, selectedDate) ? invite : null;
}
