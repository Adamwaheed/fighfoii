import { NextResponse } from "next/server";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

/** Widest we ever store. Articles render at 581px, so this covers 2x displays. */
const MAX_WIDTH = 1600;
const MAX_BYTES = 15 * 1024 * 1024;

const ACCEPTED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  "image/tiff",
]);

export async function POST(request: Request) {
  // Uploads write to disk, so they are never anonymous.
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "ވަދެވަޑައިގަންނަވާ" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "ފޮޓޯއެއް ނުލިބުނު" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "ފޮޓޯ ބޮޑުވެއްޖެ (15MB)" }, { status: 413 });
  }
  if (file.type && !ACCEPTED.has(file.type)) {
    return NextResponse.json({ error: "މި ބާވަތުގެ ފައިލެއް ބަލައެއް ނުގަނެވޭ" }, { status: 415 });
  }

  const input = Buffer.from(await file.arrayBuffer());

  try {
    // Decoding also validates: a mislabelled or corrupt file throws here rather
    // than landing in public/ as an arbitrary blob.
    const pipeline = sharp(input, { limitInputPixels: 268402689 })
      // Apply EXIF orientation, then drop all metadata (sharp's default),
      // which strips GPS and camera info along with it.
      .rotate()
      .resize({ width: MAX_WIDTH, withoutEnlargement: true });

    const [webp, meta] = await Promise.all([
      pipeline.clone().webp({ quality: 78, effort: 5 }).toBuffer(),
      sharp(input).metadata(),
    ]);

    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const name = `${crypto.randomUUID()}.webp`;
    await fs.writeFile(path.join(UPLOAD_DIR, name), webp);

    const out = await sharp(webp).metadata();

    return NextResponse.json({
      url: `/uploads/${name}`,
      width: out.width,
      height: out.height,
      bytes: webp.length,
      originalBytes: file.size,
      originalFormat: meta.format,
    });
  } catch {
    return NextResponse.json(
      { error: "ފޮޓޯ ޕްރޮސެސްކުރުމުގައި މައްސަލައެއް" },
      { status: 422 }
    );
  }
}
