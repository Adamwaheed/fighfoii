import "server-only";

export interface TurathChapter {
  title: string;
  level: number;
  /** Printed page number, as given in the source's table of contents. */
  printedPage: number;
}

export interface TurathPage {
  text: string;
  /** Printed page number, which does not start at 1 in most books. */
  printedPage: number;
  volume: string;
}

export interface TurathBook {
  id: number;
  title: string;
  chapters: TurathChapter[];
  pages: TurathPage[];
}

/** Pulls the numeric book id out of any of the app's URL shapes. */
export function parseBookId(input: string): number | null {
  const trimmed = input.trim();
  const fromUrl = trimmed.match(/\/book\/(\d+)/);
  if (fromUrl) return Number(fromUrl[1]);
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  return null;
}

type Json = Record<string, unknown>;

const isRecord = (v: unknown): v is Json => typeof v === "object" && v !== null;

/**
 * Finds the table of contents by shape rather than by key name.
 *
 * The payload's container keys are single Arabic diacritics, which are opaque
 * and could change; the records inside carry plain `title`/`level`/`page`
 * fields. Matching on the record shape survives a rename of the wrapper.
 */
function findChapters(root: Json): TurathChapter[] {
  const out: TurathChapter[] = [];

  const visit = (value: unknown, depth: number) => {
    if (out.length || depth > 3) return;

    if (Array.isArray(value)) {
      const looksLikeToc =
        value.length > 0 &&
        value.every(
          (r) =>
            isRecord(r) &&
            typeof r.title === "string" &&
            typeof r.page === "number"
        );
      if (looksLikeToc) {
        for (const r of value as Json[]) {
          out.push({
            title: String(r.title).trim(),
            level: Math.min(Math.max(Number(r.level) || 1, 1), 4),
            printedPage: Number(r.page) || 1,
          });
        }
        return;
      }
      return;
    }

    if (isRecord(value)) for (const v of Object.values(value)) visit(v, depth + 1);
  };

  visit(root, 0);
  return out;
}

/**
 * Best-effort title from the metadata object.
 *
 * The minimum length matters: the metadata also carries short code fields
 * (language, type) that a naive "shortest string" rule picks up instead of the
 * title. Titles are also editable after import, so this only needs to be close.
 */
function findTitle(root: Json, bookId: number): string {
  for (const value of Object.values(root)) {
    if (!isRecord(value)) continue;
    const containsId = Object.values(value).some((v) => v === bookId);
    if (!containsId) continue;

    const strings = Object.values(value)
      .filter((v): v is string => typeof v === "string")
      .map((v) => v.trim())
      .filter((v) => v.length >= 8 && v.length <= 120)
      .sort((a, b) => a.length - b.length);
    if (strings[0]) return strings[0];
  }
  return `ފޮތް ${bookId}`;
}

export function parseTurathBook(raw: unknown, bookId: number): TurathBook {
  if (!isRecord(raw)) throw new Error("ފޮތުގެ ޑޭޓާ ކިޔޭ ގޮތަކަށް ނެތް");

  const rawPages = raw.pages;
  if (!Array.isArray(rawPages) || rawPages.length === 0) {
    throw new Error("ފޮތުގައި ޞަފުޙާއެއް ނެތް");
  }

  const pages: TurathPage[] = rawPages
    .filter(isRecord)
    .map((p, i) => ({
      text: typeof p.text === "string" ? p.text : "",
      printedPage: Number(p.page) || i + 1,
      volume: p.vol == null ? "" : String(p.vol),
    }));

  return {
    id: bookId,
    title: findTitle(raw, bookId),
    chapters: findChapters(raw),
    pages,
  };
}

/** Downloads and parses one book. */
export async function fetchTurathBook(bookId: number): Promise<TurathBook> {
  const res = await fetch(`https://files.turath.io/books-v3/${bookId}.json`, {
    headers: { accept: "application/json", referer: "https://app.turath.io/" },
    signal: AbortSignal.timeout(90_000),
  });

  if (res.status === 404) throw new Error("މި ނަންބަރުގެ ފޮތެއް ނުފެނުނު");
  if (!res.ok) throw new Error(`ފޮތް ނުލިބުނު (${res.status})`);

  return parseTurathBook(await res.json(), bookId);
}

/**
 * Maps a printed page number onto our sequential page numbering.
 *
 * Printed numbers rarely start at 1 — this book starts at 5 — so a chapter
 * marked "page 17" is not our seventeenth row. Falls back to the nearest
 * earlier page so a chapter never lands outside the book.
 */
export function mapPrintedToSequential(
  pages: TurathPage[],
  printedPage: number
): number {
  const exact = pages.findIndex((p) => p.printedPage === printedPage);
  if (exact !== -1) return exact + 1;

  let best = 0;
  pages.forEach((p, i) => {
    if (p.printedPage <= printedPage) best = i;
  });
  return best + 1;
}
