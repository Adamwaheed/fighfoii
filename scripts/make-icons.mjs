/**
 * Builds the site icons from public/logo.png.
 *
 * The wordmark is two lines of Thaana and turns to mush below about 48px — it
 * was checked at 16px and is unreadable — so the icons use the first glyph
 * instead (the right-hand one, the mark being RTL). The crop bounds were
 * measured off the alpha channel: the top line ends at column 796, and row 162
 * is the last row before the second line bleeds in.
 *
 * Run with: node scripts/make-icons.mjs
 */
import sharp from "sharp";
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(root, "public", "logo.png");

/** Measured bounds of the first glyph. */
const GLYPH = { left: 606, top: 0, width: 190, height: 162 };

/** --paper, so the flattened icons sit on the site's own background. */
const PAPER = { r: 244, g: 248, b: 253, alpha: 1 };

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

/** The glyph on a square canvas, inset so it never touches the edge. */
function square(size, background) {
  const inset = Math.round(size * 0.08);
  return sharp(SRC)
    .extract(GLYPH)
    .resize(size - inset * 2, size - inset * 2, {
      fit: "contain",
      background: TRANSPARENT,
    })
    .extend({
      top: inset,
      bottom: inset,
      left: inset,
      right: inset,
      background: TRANSPARENT,
    })
    .flatten({ background })
    .png();
}

/** ICO is a small header plus, in modern form, embedded PNGs. */
function buildIco(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(pngs.length, 4);

  let offset = 6 + pngs.length * 16;
  const entries = pngs.map(({ size, data }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0); // width  (0 means 256)
    e.writeUInt8(size >= 256 ? 0 : size, 1); // height
    e.writeUInt8(0, 2); // palette
    e.writeUInt8(0, 3); // reserved
    e.writeUInt16LE(1, 4); // colour planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    return e;
  });

  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)]);
}

const flattenedIcon = (size) =>
  square(size, PAPER)
    .toBuffer()
    .then((data) => ({ size, data }));

// Transparent, so the tab icon works against a light or dark browser chrome.
await square(512, TRANSPARENT).toFile(join(root, "app", "icon.png"));

// iOS composites transparency against black, so this one is opaque.
await square(180, PAPER).toFile(join(root, "app", "apple-icon.png"));

// Legacy /favicon.ico, for anything that asks for it by that name.
const ico = buildIco(await Promise.all([16, 32, 48].map(flattenedIcon)));
writeFileSync(join(root, "public", "favicon.ico"), ico);

console.log("icons written: app/icon.png, app/apple-icon.png, public/favicon.ico");
