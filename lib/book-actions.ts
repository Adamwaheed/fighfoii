"use server";

import fs from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "./auth";
import { getDb } from "./db";
import { translateTitles } from "./gemini";
import type { BlockType } from "./types";

/** Replaces a page's Dhivehi blocks — the editor posts the full ordered list. */
export async function savePageBlocks(
  pageId: number,
  blocks: {
    type: BlockType;
    main: string;
    sub: string;
    ref: string;
    level: number;
    image: string;
    style: string;
  }[]
) {
  await requireUser();
  const db = getDb();

  db.transaction(() => {
    db.prepare("DELETE FROM page_blocks WHERE page_id = ?").run(pageId);
    const insert = db.prepare(
      `INSERT INTO page_blocks (page_id, sort, type, main, sub, ref, level, image, style)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    blocks.forEach((b, i) =>
      insert.run(pageId, i, b.type, b.main, b.sub, b.ref, b.level, b.image, b.style)
    );
    db.prepare("UPDATE book_pages SET updated_at = datetime('now') WHERE id = ?").run(
      pageId
    );
  })();

  revalidatePath("/admin/books");
}

export async function setPageStatus(pageId: number, status: "pending" | "translated") {
  await requireUser();
  getDb()
    .prepare(
      `UPDATE book_pages
       SET status = ?,
           translated_at = CASE WHEN ? = 'translated' THEN datetime('now') ELSE NULL END,
           updated_at = datetime('now')
       WHERE id = ?`
    )
    .run(status, status, pageId);
  revalidatePath("/admin/books");
}

/**
 * Records a reviewer verdict on a translated page. Clearing it back to "none"
 * also clears the note, so a stale objection cannot linger on an approved page.
 */
export async function setPageApproval(
  pageId: number,
  approval: "none" | "approved" | "rejected",
  note = ""
) {
  const me = await requireUser();

  getDb()
    .prepare(
      `UPDATE book_pages
       SET approval = ?,
           approval_note = ?,
           approved_at = CASE WHEN ? = 'none' THEN NULL ELSE datetime('now') END,
           approved_by = CASE WHEN ? = 'none' THEN NULL ELSE ? END,
           updated_at = datetime('now')
       WHERE id = ?`
    )
    .run(
      approval,
      approval === "none" ? "" : note.trim(),
      approval,
      approval,
      me.id,
      pageId
    );

  revalidatePath("/admin/books");
  // Approval is what makes a page public, so the reader and library must follow.
  revalidatePath("/", "layout");
}

export async function saveSourceText(pageId: number, text: string) {
  await requireUser();
  getDb()
    .prepare(
      "UPDATE book_pages SET source_text = ?, updated_at = datetime('now') WHERE id = ?"
    )
    .run(text, pageId);
  revalidatePath("/admin/books");
}

/**
 * Appends blank pages to a book and keeps page_count in step.
 *
 * Pages are numbered from the current maximum rather than from page_count, so
 * a book whose counts have drifted still gets contiguous numbering instead of
 * colliding with an existing page.
 */
export async function addPages(bookId: number, count: number) {
  await requireUser();

  const n = Math.min(Math.max(Math.trunc(count) || 1, 1), 200);
  const db = getDb();

  const book = db.prepare("SELECT id FROM books WHERE id = ?").get(bookId);
  if (!book) return { error: "ފޮތެއް ނުފެނުނު", added: 0 };

  const { maxNo } = db
    .prepare("SELECT COALESCE(MAX(page_no), 0) AS maxNo FROM book_pages WHERE book_id = ?")
    .get(bookId) as { maxNo: number };

  const insert = db.prepare(
    "INSERT INTO book_pages (book_id, page_no, source_text) VALUES (?, ?, '')"
  );

  db.transaction(() => {
    for (let i = 1; i <= n; i++) insert.run(bookId, maxNo + i);
    db.prepare(
      `UPDATE books
       SET page_count = (SELECT COUNT(*) FROM book_pages WHERE book_id = ?),
           updated_at = datetime('now')
       WHERE id = ?`
    ).run(bookId, bookId);
  })();

  revalidatePath("/admin/books");
  return { error: null, added: n, firstPage: maxNo + 1 };
}

/* ---------- chapters ---------- */

export async function addChapter(
  bookId: number,
  title: string,
  startPage: number,
  level = 1
) {
  await requireUser();
  const clean = title.trim();
  if (!clean) return { error: "ސުރުޚީ ލިޔުއްވާ" };

  const db = getDb();
  const { pages } = db
    .prepare("SELECT COUNT(*) AS pages FROM book_pages WHERE book_id = ?")
    .get(bookId) as { pages: number };

  const page = Math.min(Math.max(Math.trunc(startPage) || 1, 1), Math.max(pages, 1));

  db.prepare(
    `INSERT INTO book_chapters (book_id, title, start_page, level, sort)
     VALUES (?, ?, ?, ?, ?)`
  ).run(bookId, clean, page, Math.min(Math.max(level, 1), 4), page);

  revalidatePath("/admin/books");
  return { error: null };
}

export async function updateChapter(
  id: number,
  title: string,
  startPage: number,
  level = 1,
  titleDv = ""
) {
  await requireUser();
  const clean = title.trim();
  if (!clean) return { error: "ސުރުޚީ ލިޔުއްވާ" };

  const db = getDb();
  const row = db.prepare("SELECT book_id FROM book_chapters WHERE id = ?").get(id) as
    | { book_id: number }
    | undefined;
  if (!row) return { error: "ބާބެއް ނުފެނުނު" };

  const { pages } = db
    .prepare("SELECT COUNT(*) AS pages FROM book_pages WHERE book_id = ?")
    .get(row.book_id) as { pages: number };
  const page = Math.min(Math.max(Math.trunc(startPage) || 1, 1), Math.max(pages, 1));

  db.prepare(
    `UPDATE book_chapters
        SET title = ?, title_dv = ?, start_page = ?, level = ?, sort = ?
      WHERE id = ?`
  ).run(clean, titleDv.trim(), page, Math.min(Math.max(level, 1), 4), page, id);

  revalidatePath("/admin/books");
  revalidatePath("/", "layout");
  return { error: null };
}

/**
 * Translates one chapter title, replacing whatever is there.
 *
 * Separate from the batch call because this one is a deliberate act on a single
 * chapter — used to redo a title the model got wrong — so it overwrites, where
 * the batch deliberately skips anything already translated.
 */
export async function translateChapter(id: number) {
  await requireUser();

  const db = getDb();
  const row = db
    .prepare("SELECT id, book_id, title FROM book_chapters WHERE id = ?")
    .get(id) as { id: number; book_id: number; title: string } | undefined;
  if (!row) return { error: "ބާބެއް ނުފެނުނު", title: "" };

  let out: string[];
  try {
    out = await translateTitles([row.title]);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "ތަރުޖަމާ ނުކުރެވުނު",
      title: "",
    };
  }

  const dv = out[0]?.trim();
  if (!dv) return { error: "ތަރުޖަމާއެއް ނުލިބުނު", title: "" };

  db.prepare("UPDATE book_chapters SET title_dv = ? WHERE id = ?").run(dv, id);

  revalidatePath("/admin/books");
  revalidatePath("/", "layout");
  return { error: null, title: dv };
}

/**
 * Translates every chapter title that does not have a Dhivehi one yet.
 *
 * Titles go over in a single batch and come back positionally, so each result
 * is written against the chapter it was sent for rather than by matching text.
 */
export async function translateChapters(bookId: number) {
  await requireUser();

  const db = getDb();
  const pending = db
    .prepare(
      `SELECT id, title FROM book_chapters
        WHERE book_id = ? AND trim(title_dv) = ''
        ORDER BY start_page, sort, id`
    )
    .all(bookId) as { id: number; title: string }[];

  if (!pending.length) return { error: null, translated: 0 };

  let results: string[];
  try {
    results = await translateTitles(pending.map((c) => c.title));
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "ތަރުޖަމާ ނުކުރެވުނު",
      translated: 0,
    };
  }

  const write = db.prepare("UPDATE book_chapters SET title_dv = ? WHERE id = ?");
  let count = 0;
  db.transaction(() => {
    pending.forEach((c, i) => {
      const dv = results[i]?.trim();
      if (!dv) return;
      write.run(dv, c.id);
      count++;
    });
  })();

  revalidatePath("/admin/books");
  revalidatePath("/", "layout");
  return { error: null, translated: count };
}

export async function deleteChapter(id: number) {
  await requireUser();
  // Chapters are only markers, so removing one never touches page content.
  getDb().prepare("DELETE FROM book_chapters WHERE id = ?").run(id);
  revalidatePath("/admin/books");
  return { error: null };
}

export async function updateBook(formData: FormData) {
  await requireUser();
  const id = Number(formData.get("id"));
  const categoryId = Number(formData.get("categoryId"));

  getDb()
    .prepare(
      `UPDATE books SET
         title = ?, title_dv = ?, author = ?, category_id = ?, description = ?,
         cover = ?, published = ?, updated_at = datetime('now')
       WHERE id = ?`
    )
    .run(
      String(formData.get("title") ?? "").trim() || "ފޮތެއް",
      String(formData.get("titleDv") ?? "").trim(),
      String(formData.get("author") ?? "").trim(),
      Number.isInteger(categoryId) && categoryId > 0 ? categoryId : null,
      String(formData.get("description") ?? "").trim(),
      String(formData.get("cover") ?? "").trim(),
      formData.get("published") === "on" ? 1 : 0,
      id
    );

  revalidatePath("/admin/books");
  // The library reads from the same rows, so refresh the public tree too.
  revalidatePath("/", "layout");
}

/** Translates the book's own title, the same way chapter titles are done. */
export async function translateBookTitle(id: number) {
  await requireUser();

  const db = getDb();
  const row = db.prepare("SELECT title FROM books WHERE id = ?").get(id) as
    | { title: string }
    | undefined;
  if (!row) return { error: "ފޮތެއް ނުފެނުނު", title: "" };

  let out: string[];
  try {
    out = await translateTitles([row.title]);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "ތަރުޖަމާ ނުކުރެވުނު", title: "" };
  }

  const dv = out[0]?.trim();
  if (!dv) return { error: "ތަރުޖަމާއެއް ނުލިބުނު", title: "" };

  db.prepare("UPDATE books SET title_dv = ? WHERE id = ?").run(dv, id);
  revalidatePath("/admin/books");
  revalidatePath("/", "layout");
  return { error: null, title: dv };
}

/**
 * Publish state on its own, so it can be flipped from the translator without
 * round-tripping the whole metadata form.
 */
export async function setBookPublished(id: number, published: boolean) {
  await requireUser();

  getDb()
    .prepare("UPDATE books SET published = ?, updated_at = datetime('now') WHERE id = ?")
    .run(published ? 1 : 0, id);

  revalidatePath("/admin/books");
  // The library and the reading view both read these rows.
  revalidatePath("/", "layout");
  return { error: null };
}

export async function deleteBook(id: number) {
  await requireUser();
  const db = getDb();
  const book = db.prepare("SELECT pdf_path FROM books WHERE id = ?").get(id) as
    | { pdf_path: string }
    | undefined;

  db.prepare("DELETE FROM books WHERE id = ?").run(id);

  // Remove the PDF too, so deleting a book does not leave the file behind.
  if (book?.pdf_path) {
    await fs
      .unlink(path.join(process.cwd(), "public", book.pdf_path.replace(/^\//, "")))
      .catch(() => {});
  }

  revalidatePath("/admin/books");
  redirect("/admin/books");
}
