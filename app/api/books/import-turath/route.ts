import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { fetchTurathBook, mapPrintedToSequential, parseBookId } from "@/lib/turath";
import { slugify } from "@/lib/utils-format";

export const runtime = "nodejs";
export const maxDuration = 180;

/** Imports a book — metadata, chapters and every page — from a source URL. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "ވަދެވަޑައިގަންނަވާ" }, { status: 401 });

  const { url } = (await request.json()) as { url?: string };
  const bookId = parseBookId(url ?? "");
  if (!bookId) {
    return NextResponse.json(
      { error: "ފޮތުގެ ލިންކު ނުވަތަ ނަންބަރު ރަނގަޅެއް ނޫން" },
      { status: 400 }
    );
  }

  const db = getDb();
  const existing = db
    .prepare("SELECT id, title FROM books WHERE source_ref = ?")
    .get(`turath:${bookId}`) as { id: number; title: string } | undefined;
  if (existing) {
    return NextResponse.json(
      { error: `މި ފޮތް ކުރިންވެސް އިމްޕޯޓްކުރެވިފައިވެއެވެ`, bookId: existing.id },
      { status: 409 }
    );
  }

  let book;
  try {
    book = await fetchTurathBook(bookId);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "ފޮތް ނުލިބުނު" },
      { status: 502 }
    );
  }

  const info = db
    .prepare(
      `INSERT INTO books (slug, title, author, source_type, pdf_path, page_count, source_ref)
       VALUES (?, ?, '', 'text', '', ?, ?)`
    )
    .run(
      `${slugify(book.title)}-${Date.now().toString(36)}`,
      book.title,
      book.pages.length,
      `turath:${bookId}`
    );

  const newId = info.lastInsertRowid as number;

  const insertPage = db.prepare(
    "INSERT INTO book_pages (book_id, page_no, source_text) VALUES (?, ?, ?)"
  );
  const insertChapter = db.prepare(
    `INSERT INTO book_chapters (book_id, title, start_page, level, sort)
     VALUES (?, ?, ?, ?, ?)`
  );

  db.transaction(() => {
    book.pages.forEach((p, i) => insertPage.run(newId, i + 1, p.text));

    // Chapter markers reference printed page numbers, which rarely start at 1;
    // they have to be mapped onto our sequential numbering.
    book.chapters.forEach((c) => {
      const seq = mapPrintedToSequential(book.pages, c.printedPage);
      insertChapter.run(newId, c.title, seq, c.level, seq);
    });
  })();

  return NextResponse.json({
    id: newId,
    title: book.title,
    pageCount: book.pages.length,
    chapterCount: book.chapters.length,
  });
}
