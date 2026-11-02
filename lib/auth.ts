import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "./db";
import { hashPassword, verifyPassword } from "./password";

export { hashPassword, verifyPassword };

const COOKIE = "ff_session";
const SESSION_DAYS = 30;

/* ---------- users ---------- */

export interface AuthUser {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
}

export function countUsers(): number {
  return (getDb().prepare("SELECT COUNT(*) AS c FROM users").get() as { c: number }).c;
}

export function createUser(input: {
  username: string;
  password: string;
  name: string;
  email: string;
  role?: string;
}): AuthUser {
  const info = getDb()
    .prepare(
      `INSERT INTO users (username, name, email, password_hash, role)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(
      input.username,
      input.name,
      input.email,
      hashPassword(input.password),
      input.role ?? "admin"
    );

  return {
    id: info.lastInsertRowid as number,
    username: input.username,
    name: input.name,
    email: input.email,
    role: input.role ?? "admin",
  };
}

/* ---------- sessions ---------- */

const sha256 = (v: string) => crypto.createHash("sha256").update(v).digest("hex");

/** Issues a session and sets the cookie. Returns nothing; the cookie is the handle. */
export async function startSession(userId: number) {
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5);

  getDb()
    .prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)")
    .run(sha256(token), userId, expires.toISOString());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    getDb().prepare("DELETE FROM sessions WHERE token_hash = ?").run(sha256(token));
  }
  jar.delete(COOKIE);
}

/** The signed-in user, or null. Expired sessions are cleaned up on read. */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;

  const db = getDb();
  const row = db
    .prepare(
      `SELECT u.id, u.username, u.name, u.email, u.role, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ?`
    )
    .get(sha256(token)) as (AuthUser & { expires_at: string }) | undefined;

  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(sha256(token));
    return null;
  }

  return {
    id: row.id,
    username: row.username,
    name: row.name,
    email: row.email,
    role: row.role,
  };
}

/**
 * Guard for anything that must not run anonymously. Server actions call this
 * too — a redirect in the admin layout only protects rendering, not the
 * action endpoints, which are reachable directly.
 */
export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/* ---------- brute-force throttle ---------- */

const attempts = new Map<string, { count: number; until: number }>();
const MAX_ATTEMPTS = 8;
const LOCKOUT_MS = 10 * 60_000;

export function throttleCheck(key: string): number {
  const rec = attempts.get(key);
  if (!rec) return 0;
  if (rec.until > Date.now() && rec.count >= MAX_ATTEMPTS) {
    return Math.ceil((rec.until - Date.now()) / 60_000);
  }
  if (rec.until <= Date.now()) attempts.delete(key);
  return 0;
}

export function throttleFail(key: string) {
  const rec = attempts.get(key) ?? { count: 0, until: 0 };
  rec.count += 1;
  rec.until = Date.now() + LOCKOUT_MS;
  attempts.set(key, rec);
}

export function throttleReset(key: string) {
  attempts.delete(key);
}
