import { NextResponse } from "next/server";
import { hasGeminiKey } from "@/lib/gemini";
import { isSupportedStatement, readStatement } from "@/lib/zakat";

const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Reads an uploaded bank statement and returns the balances found in it.
 *
 * The file is held in memory for this request only: nothing is written to disk,
 * nothing is stored in the database, and the response carries figures rather
 * than any part of the document. The upload is not logged.
 */
export async function POST(req: Request) {
  if (!hasGeminiKey()) {
    return NextResponse.json(
      { error: "މި ފީޗަރ އަދި ސެޓުކުރެވިފައި ނެތެވެ" },
      { status: 503 }
    );
  }

  let fd: FormData;
  try {
    fd = await req.formData();
  } catch {
    return NextResponse.json({ error: "ފައިލް ނުލިބުނު" }, { status: 400 });
  }

  const file = fd.get("statement");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "ފައިލެއް ހޮއްވަވާ" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "ފައިލް ބޮޑުވެއްޖެ (8MB)" }, { status: 400 });
  }
  if (!isSupportedStatement(file.type)) {
    return NextResponse.json(
      { error: "PDF ނުވަތަ ފޮޓޯއެއް ހޮއްވަވާ" },
      { status: 400 }
    );
  }

  try {
    const reading = await readStatement(
      Buffer.from(await file.arrayBuffer()),
      file.type
    );
    return NextResponse.json(reading, {
      // Nothing about a statement should sit in any cache.
      headers: { "cache-control": "private, no-store" },
    });
  } catch (err) {
    // The message is surfaced, never the document.
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "ނުކިޔުނު" },
      { status: 502 }
    );
  }
}
