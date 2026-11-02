import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { splitIntoPages } from "@/lib/text-split";
import { slugify } from "@/lib/utils-format";

export const runtime = "nodejs";

const MAX_CHARS = 2_000_000;

/** Creates a book from pasted source text, split into pages. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "ވަދެވަޑައިގަންނަވާ" }, { status: 401 });

  const body = (await request.json()) as {
    title?: string;
    author?: string;
    text?: string;
    charsPerPage?: number;
    separator?: string;
  };

  const text = (body.text ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "ލިޔުން ލިޔުއްވާ" }, { status: 400 });
  }
  if (text.length > MAX_CHARS) {
    return NextResponse.json({ error: "ލިޔުން ދިގުވެއްޖެ" }, { status: 413 });
  }

  const pages = splitIntoPages(text, {
    charsPerPage: Number(body.charsPerPage) || undefined,
    separator: body.separator ?? "",
  });
  if (pages.length === 0) {
    return NextResponse.json({ error: "ޞަފުޙާއެއް ނުއުފެއްދުނު" }, { status: 422 });
  }

  const title = (body.title ?? "").trim() || "ފޮތެއް";
  const db = getDb();

  const info = db
    .prepare(
      `INSERT INTO books (slug, title, author, source_type, pdf_path, page_count)
       VALUES (?, ?, ?, 'text', '', ?)`
    )
    .run(
      `${slugify(title)}-${Date.now().toString(36)}`,
      title,
      (body.author ?? "").trim(),
      pages.length
    );

  const bookId = info.lastInsertRowid as number;

  // The source text lives on the page itself; there is no file to re-read.
  const insertPage = db.prepare(
    "INSERT INTO book_pages (book_id, page_no, source_text) VALUES (?, ?, ?)"
  );
  db.transaction(() => {
    pages.forEach((content, i) => insertPage.run(bookId, i + 1, content));
  })();

  return NextResponse.json({ id: bookId, pageCount: pages.length, title });
}
