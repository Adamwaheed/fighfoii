import { NextResponse } from "next/server";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { slugify } from "@/lib/utils-format";

export const runtime = "nodejs";

const BOOK_DIR = path.join(process.cwd(), "public", "uploads", "books");
const MAX_BYTES = 120 * 1024 * 1024;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "ވަދެވަޑައިގަންނަވާ" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  const title = String(form.get("title") ?? "").trim();

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "PDF އެއް ނުލިބުނު" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "ފައިލް ބޮޑުވެއްޖެ (120MB)" }, { status: 413 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  let pageCount: number;
  try {
    // Parsing here doubles as validation — a non-PDF never reaches disk.
    const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
    pageCount = pdf.getPageCount();
  } catch {
    return NextResponse.json({ error: "މިއީ ރަނގަޅު PDF އެއް ނޫން" }, { status: 415 });
  }
  if (pageCount < 1) {
    return NextResponse.json({ error: "PDF ގައި ޞަފުޙާއެއް ނެތް" }, { status: 422 });
  }

  await fs.mkdir(BOOK_DIR, { recursive: true });
  const name = `${crypto.randomUUID()}.pdf`;
  await fs.writeFile(path.join(BOOK_DIR, name), bytes);

  const bookTitle = title || file.name.replace(/\.pdf$/i, "") || "ފޮތެއް";
  const db = getDb();
  const info = db
    .prepare(
      `INSERT INTO books (slug, title, author, pdf_path, page_count, kind)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      `${slugify(bookTitle)}-${Date.now().toString(36)}`,
      bookTitle,
      String(form.get("author") ?? "").trim(),
      `/uploads/books/${name}`,
      pageCount,
      // A download-only book skips the translation pipeline entirely.
      form.get("kind") === "file" ? "file" : "translate"
    );

  const bookId = info.lastInsertRowid as number;

  // Materialise a row per page so status and ordering exist from the start.
  const insertPage = db.prepare(
    "INSERT INTO book_pages (book_id, page_no) VALUES (?, ?)"
  );
  db.transaction(() => {
    for (let n = 1; n <= pageCount; n++) insertPage.run(bookId, n);
  })();

  return NextResponse.json({ id: bookId, pageCount, title: bookTitle });
}
