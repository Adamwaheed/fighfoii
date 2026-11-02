"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "./auth";
import { getDb } from "./db";
import { addComment, addQuestion } from "./engagement";

/**
 * Reader submissions and the editor actions that dispose of them.
 *
 * The submit actions are deliberately public — that is the point of a feedback
 * form — so each validates its own input and neither returns anything a caller
 * could use to enumerate the database.
 */

/** Honeypot: a hidden field only an automated submitter fills in. */
function looksAutomated(fd: FormData): boolean {
  return String(fd.get("website") ?? "").trim() !== "";
}

export async function submitComment(fd: FormData) {
  if (looksAutomated(fd)) return { error: null };

  const res = addComment({
    slug: String(fd.get("slug") ?? ""),
    name: String(fd.get("name") ?? ""),
    contact: String(fd.get("contact") ?? ""),
    body: String(fd.get("body") ?? ""),
  });

  if (!res.error) revalidatePath("/admin/inbox");
  return res;
}

export async function submitQuestion(fd: FormData) {
  if (looksAutomated(fd)) return { error: null };

  const res = addQuestion({
    name: String(fd.get("name") ?? ""),
    viber: String(fd.get("viber") ?? ""),
    body: String(fd.get("body") ?? ""),
  });

  if (!res.error) revalidatePath("/admin/inbox");
  return res;
}

export async function setCommentStatus(id: number, status: "new" | "read" | "archived") {
  await requireUser();
  getDb().prepare("UPDATE comments SET status = ? WHERE id = ?").run(status, id);
  revalidatePath("/admin/inbox");
  return { error: null };
}

export async function deleteComment(id: number) {
  await requireUser();
  getDb().prepare("DELETE FROM comments WHERE id = ?").run(id);
  revalidatePath("/admin/inbox");
  return { error: null };
}

export async function answerQuestion(id: number, answer: string) {
  await requireUser();
  getDb()
    .prepare(
      `UPDATE questions
          SET answer = ?, status = 'answered', answered_at = datetime('now')
        WHERE id = ?`
    )
    .run(answer.trim(), id);
  revalidatePath("/admin/inbox");
  return { error: null };
}

export async function setQuestionStatus(id: number, status: "new" | "answered" | "closed") {
  await requireUser();
  getDb().prepare("UPDATE questions SET status = ? WHERE id = ?").run(status, id);
  revalidatePath("/admin/inbox");
  return { error: null };
}

export async function deleteQuestion(id: number) {
  await requireUser();
  getDb().prepare("DELETE FROM questions WHERE id = ?").run(id);
  revalidatePath("/admin/inbox");
  return { error: null };
}
