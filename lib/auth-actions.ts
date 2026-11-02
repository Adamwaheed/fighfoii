"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createUser,
  endSession,
  getCurrentUser,
  requireUser,
  startSession,
  throttleCheck,
  throttleFail,
  throttleReset,
  verifyPassword,
  hashPassword,
} from "./auth";
import { getDb } from "./db";

export interface AuthFormState {
  error: string | null;
}

/** Sign in with username + password. */
export async function login(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { error: "ޔޫޒަރނޭމާއި ޕާސްވޯޑު ފުރިހަމަކުރައްވާ" };
  }

  const locked = throttleCheck(username);
  if (locked > 0) {
    return { error: `ގިނަ ފަހަރު ނުބައިވެފައިވާތީ ${locked} މިނެޓު ފަހުން މަސައްކަތްކުރައްވާ` };
  }

  const row = getDb()
    .prepare("SELECT id, password_hash FROM users WHERE username = ?")
    .get(username) as { id: number; password_hash: string } | undefined;

  // Same message whether the user is missing or the password is wrong, so the
  // form cannot be used to enumerate accounts.
  if (!row || !verifyPassword(password, row.password_hash)) {
    throttleFail(username);
    return { error: "ޔޫޒަރނޭމް ނުވަތަ ޕާސްވޯޑު ރަނގަޅެއް ނޫން" };
  }

  throttleReset(username);
  await startSession(row.id);
  redirect("/admin");
}

export async function logout() {
  await endSession();
  revalidatePath("/", "layout");
  redirect("/login");
}

/* ---------- user management (admin panel only) ---------- */

function assertAdmin(role: string) {
  if (role !== "admin") throw new Error("މި ޢަމަލު ކުރެއްވުމުގެ ހުއްދައެއް ނެތެވެ");
}

export async function createUserAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const me = await requireUser();
  assertAdmin(me.role);

  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!/^[a-z0-9_.-]{3,32}$/.test(username)) {
    return { error: "ޔޫޒަރނޭމަކީ 3-32 އަކުރުގެ (a-z, 0-9, _ . -) އެއްޗަކަށް ވާންޖެހޭނެ" };
  }
  if (password.length < 8) {
    return { error: "ޕާސްވޯޑުގައި މަދުވެގެން 8 އަކުރު ހުންނަންވާނެ" };
  }
  if (getDb().prepare("SELECT 1 FROM users WHERE username = ?").get(username)) {
    return { error: "މި ޔޫޒަރނޭމް ކުރިންވެސް ބޭނުންކުރެވިފައިވެއެވެ" };
  }

  createUser({
    username,
    password,
    name: String(formData.get("name") ?? "").trim() || username,
    email: String(formData.get("email") ?? "").trim(),
    role: String(formData.get("role") ?? "editor") === "admin" ? "admin" : "editor",
  });

  revalidatePath("/admin/users");
  return { error: null };
}

export async function changePasswordAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const me = await requireUser();

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");

  const row = getDb()
    .prepare("SELECT password_hash FROM users WHERE id = ?")
    .get(me.id) as { password_hash: string };

  if (!verifyPassword(current, row.password_hash)) {
    return { error: "މިހާރުގެ ޕާސްވޯޑު ރަނގަޅެއް ނޫން" };
  }
  if (next.length < 8) {
    return { error: "އައު ޕާސްވޯޑުގައި މަދުވެގެން 8 އަކުރު ހުންނަންވާނެ" };
  }
  if (next !== String(formData.get("confirm") ?? "")) {
    return { error: "ދެ ޕާސްވޯޑު އެއްގޮތެއް ނޫން" };
  }

  const db = getDb();
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(
    hashPassword(next),
    me.id
  );
  // Changing a password invalidates every other session for that account.
  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(me.id);
  await startSession(me.id);

  revalidatePath("/admin/users");
  return { error: null };
}

export async function deleteUserAction(id: number) {
  const me = await requireUser();
  assertAdmin(me.role);
  if (me.id === id) return { error: "އަމިއްލަ އެކައުންޓު ނުފޮހެވޭނެ" };

  const db = getDb();
  const admins = db
    .prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'admin'")
    .get() as { c: number };
  const target = db.prepare("SELECT role FROM users WHERE id = ?").get(id) as
    | { role: string }
    | undefined;
  if (!target) return { error: null };
  // Never leave the panel without an administrator.
  if (target.role === "admin" && admins.c <= 1) {
    return { error: "ފަހު އެޑްމިން އެކައުންޓު ނުފޮހެވޭނެ" };
  }

  db.prepare("DELETE FROM users WHERE id = ?").run(id);
  revalidatePath("/admin/users");
  return { error: null };
}

export async function currentUser() {
  return getCurrentUser();
}
