import localFont from "next/font/local";

/**
 * Thaana display face (AK Baabu Black) — headlines, masthead, section rules.
 * A single 900-weight display cut, so it is declared at that weight and the
 * heading rules ask for 900; nothing is synthetically emboldened.
 */
export const thaanaHeading = localFont({
  src: [
    { path: "../public/fonts/ak-baabu-black.woff2", weight: "900", style: "normal" },
  ],
  variable: "--font-thaana-heading",
  display: "block",
  fallback: ["sans-serif"],
});

/**
 * A_Waheed — the template's original slanted script face. Kept available as
 * `font-script` for logotype-style accents; not used for headlines.
 */
export const thaanaScript = localFont({
  src: [{ path: "../public/fonts/a-waheed.ttf", weight: "400", style: "normal" }],
  variable: "--font-thaana-script",
  display: "block",
  fallback: ["serif"],
});

/**
 * Thaana text face (AK Rasmee) — body copy, UI chrome.
 */
export const thaanaBody = localFont({
  src: [{ path: "../public/fonts/ak-rasmee.ttf", weight: "400", style: "normal" }],
  variable: "--font-thaana-body",
  display: "block",
  fallback: ["sans-serif"],
});

/**
 * KFGQPC Uthman Taha Naskh — the main Arabic face.
 *
 * A mushaf face, so its coverage is deliberately narrow: 295 mapped codepoints,
 * with no Latin letters at all and a few marks (U+06D6 among them) absent. It
 * is therefore stacked *over* Amiri rather than replacing it — the browser
 * falls through per glyph, so Arabic is set in Uthman and anything it lacks
 * still has a face to land in.
 */
export const uthman = localFont({
  src: [{ path: "../public/fonts/uthman-taha-naskh.woff2", weight: "400", style: "normal" }],
  variable: "--font-uthman",
  display: "swap",
  fallback: ["serif"],
});

/**
 * Amiri — Arabic hadith matn, references, ornaments.
 *
 * The complete upstream face, not the Google "arabic" subset. That subset maps
 * only U+0020, U+0021 and U+0028 in ASCII — notably no closing parenthesis — so
 * a verse marker like "(١)" fell back mid-run to another font, splitting the
 * shaping run and displacing the marker.
 */
export const amiri = localFont({
  src: [
    { path: "../public/fonts/amiri-400.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/amiri-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-amiri",
  display: "swap",
  fallback: ["serif"],
});

/**
 * Amiri Quran — reserved for Qur'anic ayah text only. Complete face, for the
 * same reason as Amiri above.
 */
export const amiriQuran = localFont({
  src: [{ path: "../public/fonts/amiri-quran.woff2", weight: "400", style: "normal" }],
  variable: "--font-amiri-quran",
  display: "swap",
  fallback: ["serif"],
});

export const fontVariables = [
  thaanaHeading.variable,
  thaanaScript.variable,
  thaanaBody.variable,
  uthman.variable,
  amiri.variable,
  amiriQuran.variable,
].join(" ");
