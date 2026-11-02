import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { extractPage, hasGeminiKey } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 180;

/**
 * Transcribes one page's Arabic into its source field, without translating.
 * Deliberately leaves status and approval untouched — reading the page is not
 * the same as having translated or reviewed it.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "ވަދެވަޑައިގަންނަވާ" }, { status: 401 });

  if (!hasGeminiKey()) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY ސެޓުކުރައްވާފައި ނެތެވެ" },
      { status: 503 }
    );
  }

  const { id } = await params;
  const bookId = Number(id);
  const { pageNo } = (await request.json()) as { pageNo: number };

  const db = getDb();
  const book = db.prepare("SELECT * FROM books WHERE id = ?").get(bookId) as
    | { id: number; source_type: string; pdf_path: string; page_count: number }
    | undefined;
  if (!book) return NextResponse.json({ error: "ފޮތެއް ނުފެނުނު" }, { status: 404 });

  if (book.source_type !== "pdf" || !book.pdf_path) {
    return NextResponse.json(
      { error: "ލިޔުމުގެ ފޮތްތަކުގައި މަތުނު ކުރިންވެސް ހުންނާނެއެވެ" },
      { status: 400 }
    );
  }
  if (!Number.isInteger(pageNo) || pageNo < 1 || pageNo > book.page_count) {
    return NextResponse.json({ error: "ޞަފުޙާ ނަންބަރު ރަނގަޅެއް ނޫން" }, { status: 400 });
  }

  const page = db
    .prepare("SELECT id FROM book_pages WHERE book_id = ? AND page_no = ?")
    .get(bookId, pageNo) as { id: number } | undefined;
  if (!page) return NextResponse.json({ error: "ޞަފުޙާ ނުފެނުނު" }, { status: 404 });

  try {
    const full = await fs.readFile(
      path.join(process.cwd(), "public", book.pdf_path.replace(/^\//, ""))
    );
    const source = await PDFDocument.load(full, { ignoreEncryption: true });
    const single = await PDFDocument.create();
    const [copied] = await single.copyPages(source, [pageNo - 1]);
    single.addPage(copied);

    const arabic = await extractPage(Buffer.from(await single.save()));

    db.prepare(
      "UPDATE book_pages SET source_text = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(arabic, page.id);

    return NextResponse.json({ ok: true, arabic, chars: arabic.length });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "ލިޔުން ނުނެގުނު" },
      { status: 502 }
    );
  }
}
