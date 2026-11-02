import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { hasGeminiKey, translatePage, translateText } from "@/lib/gemini";

export const runtime = "nodejs";
// Model calls on a scanned page can take a while.
export const maxDuration = 180;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "ވަދެވަޑައިގަންނަވާ" }, { status: 401 });

  if (!hasGeminiKey()) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY ސެޓުކުރައްވާފައި ނެތެވެ. .env.local ގައި އިތުރުކުރައްވާ." },
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
  if (!Number.isInteger(pageNo) || pageNo < 1 || pageNo > book.page_count) {
    return NextResponse.json({ error: "ޞަފުޙާ ނަންބަރު ރަނގަޅެއް ނޫން" }, { status: 400 });
  }

  const page = db
    .prepare("SELECT id, source_text FROM book_pages WHERE book_id = ? AND page_no = ?")
    .get(bookId, pageNo) as { id: number; source_text: string } | undefined;
  if (!page) return NextResponse.json({ error: "ޞަފުޙާ ނުފެނުނު" }, { status: 404 });

  try {
    let result;

    if (book.source_type === "text") {
      // Pasted books already hold their source; nothing to extract.
      result = await translateText(page.source_text);
    } else {
      // Send only the requested page: it keeps the request small and stops the
      // model from drifting onto neighbouring pages.
      const full = await fs.readFile(
        path.join(process.cwd(), "public", book.pdf_path.replace(/^\//, ""))
      );
      const source = await PDFDocument.load(full, { ignoreEncryption: true });
      const single = await PDFDocument.create();
      const [copied] = await single.copyPages(source, [pageNo - 1]);
      single.addPage(copied);
      result = await translatePage(Buffer.from(await single.save()));
    }

    // A page that yields nothing is not a translated page — leave it pending
    // so it stays visible in the rail as work still to do.
    const empty = result.blocks.length === 0 && !result.arabic.trim();

    const insertBlock = db.prepare(
      `INSERT INTO page_blocks (page_id, sort, type, main, sub, ref, level)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );

    db.transaction(() => {
      db.prepare("DELETE FROM page_blocks WHERE page_id = ?").run(page.id);
      result.blocks.forEach((b, i) =>
        insertBlock.run(
          page.id,
          i,
          b.type,
          b.main ?? "",
          b.sub ?? "",
          b.ref ?? "",
          b.level ?? 1
        )
      );
      db.prepare(
        `UPDATE book_pages
         SET source_text = ?, status = ?,
             translated_at = ?, updated_at = datetime('now')
         WHERE id = ?`
      ).run(
        result.arabic || page.source_text,
        empty ? "pending" : "translated",
        empty ? null : new Date().toISOString(),
        page.id
      );
    })();

    // Return the rows as saved. The client applies these directly instead of
    // waiting on a refresh — component state is not derived from props, so a
    // refresh alone would leave the form showing its previous contents.
    const saved = db
      .prepare(
        `SELECT id, type, main, sub, ref, level, image, style
         FROM page_blocks WHERE page_id = ? ORDER BY sort, id`
      )
      .all(page.id);

    return NextResponse.json({
      ok: true,
      empty,
      count: saved.length,
      arabic: result.arabic,
      blocks: saved,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "ތަރުޖަމާ ނުކުރެވުނު" },
      { status: 502 }
    );
  }
}
