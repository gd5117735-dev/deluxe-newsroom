import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";
import type { PublicUser } from "@/lib/types";
import * as repo from "./repo.server";

const COOKIE = "db_session";
const SESSION_DAYS = 30;
const ITER = 100_000;

const toHex = (b: ArrayBuffer | Uint8Array) =>
  [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
const fromHex = (h: string) => new Uint8Array((h.match(/.{2}/g) ?? []).map((x) => parseInt(x, 16)));

async function derive(password: string, salt: Uint8Array) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  return crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations: ITER }, key, 256);
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${ITER}$${toHex(salt)}$${toHex(await derive(password, salt))}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [, , salt, hash] = stored.split("$");
  if (!salt || !hash) return false;
  const got = toHex(await derive(password, fromHex(salt)));
  let diff = got.length ^ hash.length;
  for (let i = 0; i < Math.min(got.length, hash.length); i++) diff |= got.charCodeAt(i) ^ hash.charCodeAt(i);
  return diff === 0;
}

export async function startSession(userId: string) {
  const token = toHex(crypto.getRandomValues(new Uint8Array(32)));
  const maxAge = SESSION_DAYS * 86400;
  await repo.createSession(token, userId, Date.now() + maxAge * 1000);
  setCookie(COOKIE, token, { httpOnly: true, secure: true, sameSite: "none", path: "/", maxAge });
}

export async function endSession() {
  const token = getCookie(COOKIE);
  if (token) await repo.deleteSession(token);
  deleteCookie(COOKIE, { path: "/", secure: true, sameSite: "none" });
}

export async function currentUser(): Promise<PublicUser | null> {
  const token = getCookie(COOKIE);
  if (!token) return null;
  const u = await repo.getSessionUser(token);
  if (!u) return null;
  const roles = await repo.getUserRoles(u.id);
  return { id: u.id, name: u.name, email: u.email, isAdmin: roles.includes("admin") };
}

export async function requireAdmin(): Promise<PublicUser> {
  const u = await currentUser();
  if (!u?.isAdmin) throw new Error("غير مصرح: هذه العملية للمدير فقط");
  return u;
}

/** First account ever created becomes the only admin. */
export async function registerUser(name: string, email: string, password: string): Promise<PublicUser> {
  if (await repo.getUserByEmail(email)) throw new Error("هذا البريد مسجّل مسبقاً");
  const id = crypto.randomUUID();
  const isFirst = await repo.createUser(
    { id, name, email, password_hash: await hashPassword(password), created_at: Date.now() },
  );
  return { id, name, email, isAdmin: isFirst };
}
