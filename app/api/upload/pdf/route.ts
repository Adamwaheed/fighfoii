import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

const DIR = path.join(process.cwd(), "public", "uploads", "docs");
const MAX = 25 * 1024 * 1024;

/** PDFs embedded in articles. Editors only — this writes to the public tree. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const fd = await req.formData();
  const file = fd.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "ފައިލެއް ނެތް" }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "PDF އެއް ނޫން" }, { status: 400 });
  }
  if (file.size > MAX) {
    return NextResponse.json({ error: "ފައިލް ބޮޑުވެއްޖެ" }, { status: 400 });
  }

  await fs.mkdir(DIR, { recursive: true });
  // Generated name: an uploaded filename must never reach the filesystem.
  const name = `${crypto.randomUUID()}.pdf`;
  await fs.writeFile(path.join(DIR, name), Buffer.from(await file.arrayBuffer()));

  return NextResponse.json({ url: `/uploads/docs/${name}` });
}
