// pdf.js loads CMaps, standard fonts, ICC profiles and wasm decoders at
// runtime. Without them, PDFs using CID-keyed or non-embedded fonts render
// with wrong glyph mapping — Arabic in particular comes out disconnected.
import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";

const FROM = "node_modules/pdfjs-dist";
const TO = "public/pdfjs";

const ASSETS = ["cmaps", "standard_fonts", "wasm", "iccs"];

await rm(TO, { recursive: true, force: true });
await mkdir(TO, { recursive: true });

await cp(
  path.join(FROM, "build/pdf.worker.min.mjs"),
  "public/pdf.worker.min.mjs"
);

for (const dir of ASSETS) {
  await cp(path.join(FROM, dir), path.join(TO, dir), { recursive: true });
}

console.log(`pdf.js assets copied: ${ASSETS.join(", ")} + worker`);
