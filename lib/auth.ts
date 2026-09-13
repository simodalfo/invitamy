import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "invito_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 12;

function sessionSecret() {
  const secret = process.env.SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET deve contenere almeno 32 caratteri.");
  }

  return secret;
}

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

function equalDigest(left: string, right: string) {
  return timingSafeEqual(digest(left), digest(right));
}

function signature(payload: string) {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

export function passwordIsValid(candidate: string) {
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected || expected.length < 8) {
    throw new Error("ADMIN_PASSWORD deve contenere almeno 8 caratteri.");
  }

  return equalDigest(candidate, expected);
}

export function createSessionToken() {
  const payload = Buffer.from(
    JSON.stringify({ role: "admin", expiresAt: Date.now() + SESSION_DURATION_SECONDS * 1000 }),
  ).toString("base64url");

  return `${payload}.${signature(payload)}`;
}

export function verifySessionToken(token?: string) {
  if (!token) return false;

  const [payload, suppliedSignature] = token.split(".");
  if (!payload || !suppliedSignature) return false;

  try {
    if (!equalDigest(suppliedSignature, signature(payload))) return false;

    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      role?: string;
      expiresAt?: number;
    };

    return parsed.role === "admin" && typeof parsed.expiresAt === "number" && parsed.expiresAt > Date.now();
  } catch {
    return false;
  }
}

export async function isAuthenticated() {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_DURATION_SECONDS,
};
