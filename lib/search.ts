import { getDb } from "./db";
import { PUBLIC_PAGE_WHERE } from "./books";

/**
 * Full-text search across articles, books and translated book pages.
 *
 * Two things make this non-obvious, and both were settled by measuring SQLite's
 * behaviour on real content rather than by reading the docs:
 *
 *  1. Thaana *fili* (the vowel marks) are combining characters, which unicode61
 *     treats as token separators. Left alone it shreds Dhivehi into bare
 *     consonants — a four-word sentence became ten single-letter tokens, so
 *     every query would match every document. Listing the fili in `tokenchars`
 *     restores whole words.
 *
 *  2. Arabic needs the opposite. Book sources are vocalised, but nobody types
 *     harakat into a search box. `remove_diacritics 2` would strip them, but it
 *     shreds vocalised Arabic exactly the way the default shreds Dhivehi. So the
 *     harakat are removed here, in JS, before the text ever reaches SQLite.
 */

/** U+07A6–U+07B0: abafili through sukun. */
const FILI = "ަާިީުޫެޭޮޯް";

const TOKENIZE = `unicode61 remove_diacritics 0 tokenchars '${FILI}'`;

/** Characters FTS5 reads as query syntax; harmless to drop from user input. */
const FTS_SYNTAX = /["'()*:^{}[\]-]/g;

const ARABIC_MARKS = /[ً-ْٓ-ٰٟۖ-ۭ]/g;
const TATWEEL = /ـ/g;

/**
 * Folds a string to its searchable form: Arabic vowel marks and tatweel go, and
 * the alif/ya/ta-marbuta variants collapse so that a plainly-typed word finds a
 * carefully-typed one. Thaana is left intact — fili are letters, not decoration.
 */
export function normalizeForSearch(input: string): string {
  return input
    .replace(ARABIC_MARKS, "")
    .replace(TATWEEL, "")
    .replace(/[آأإٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .normalize("NFC");
}

/**
 * The same fold, but recording where each surviving character came from, so a
 * snippet can be cut from the *original* text — vocalisation intact — using
 * positions found in the folded text.
 */
function normalizeWithMap(input: string): { text: string; map: number[] } {
  let text = "";
  const map: number[] = [];
  for (let i = 0; i < input.length; i++) {
    const folded = normalizeForSearch(input[i]);
    for (const ch of folded) {
      text += ch;
      map.push(i);
    }
  }
  return { text, map };
}

/**
 * Turns what the user typed into an FTS5 MATCH expression. Every word must
 * appear, and the final word is treated as a prefix so results narrow sensibly
 * while someone is still typing it.
 */
export function buildMatchQuery(raw: string): string | null {
  const words = normalizeForSearch(raw)
    .replace(FTS_SYNTAX, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return null;

  return words
    .map((w, i) => (i === words.length - 1 ? `"${w}"*` : `"${w}"`))
    .join(" AND ");
}

export type SearchKind = "article" | "book" | "page";

export interface SearchHit {
  kind: SearchKind;
  title: string;
  label: string;
  url: string;
  /** Snippet split around the match, for highlighting without dangerous HTML. */
  snippet: { before: string; match: string; after: string } | null;
}

function ensureTable() {
  const db = getDb();
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
      title,
      body,
      kind UNINDEXED,
      label UNINDEXED,
      url UNINDEXED,
      raw_title UNINDEXED,
      raw_body UNINDEXED,
      tokenize = "${TOKENIZE}"
    );
  `);
}

/**
 * A cheap fingerprint of everything indexed. The index is rebuilt whole when
 * this changes — with content in the hundreds of rows a rebuild costs a few
 * milliseconds, which is far less machinery than keeping triggers in step with
 * every write path, and it cannot silently drift.
 */
function contentSignature(): string {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT
         (SELECT count(*) FROM articles)   || ':' ||
         (SELECT coalesce(max(updated_at),'') FROM articles) || ':' ||
         (SELECT count(*) FROM blocks)     || ':' ||
         (SELECT count(*) FROM books)      || ':' ||
         (SELECT count(*) FROM book_pages) || ':' ||
         (SELECT coalesce(max(updated_at),'') FROM book_pages) || ':' ||
         (SELECT count(*) FROM book_pages WHERE approval = 'approved') || ':' ||
         (SELECT count(*) FROM page_blocks) AS sig`
    )
    .get() as { sig: string };
  return row.sig;
}

function rebuild() {
  const db = getDb();
  const insert = db.prepare(
    `INSERT INTO search_index (title, body, kind, label, url, raw_title, raw_body)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  const add = (
    kind: SearchKind,
    title: string,
    body: string,
    label: string,
    url: string
  ) => {
    insert.run(
      normalizeForSearch(title),
      normalizeForSearch(body),
      kind,
      label,
      url,
      title,
      body
    );
  };

  db.exec("DELETE FROM search_index");

  // Articles carry their body in blocks, so the whole piece is searchable, not
  // just its summary.
  const articles = db
    .prepare(
      `SELECT a.id, a.slug, a.title, a.kicker, a.excerpt, c.name AS category
         FROM articles a JOIN categories c ON c.id = a.category_id
        WHERE a.status = 'published'`
    )
    .all() as {
    id: number; slug: string; title: string; kicker: string;
    excerpt: string; category: string;
  }[];

  const blocksFor = db.prepare(
    "SELECT main, sub, ref FROM blocks WHERE article_id = ? ORDER BY sort"
  );

  for (const a of articles) {
    const blocks = blocksFor.all(a.id) as { main: string; sub: string; ref: string }[];
    const body = [a.excerpt, ...blocks.flatMap((b) => [b.main, b.sub, b.ref])]
      .filter(Boolean)
      .join("\n");
    add("article", a.title, body, a.kicker || a.category, `/article/${a.slug}`);
  }

  const books = db
    .prepare("SELECT id, slug, title, title_dv, author FROM books WHERE published = 1")
    .all() as {
    id: number; slug: string; title: string; title_dv: string; author: string;
  }[];

  for (const b of books) {
    // Both titles are indexed so either language finds the book, but the
    // Dhivehi one is what a reader sees in the result.
    const label = b.title_dv.trim() || b.title;
    add("book", label, [b.author, b.title].filter(Boolean).join("\n"), b.author || "ފޮތް", `/library/${b.slug}`);
  }

  // Book pages: both the Dhivehi translation and the Arabic it came from, so a
  // phrase can be found in either language. Only pages a reader may actually
  // open are indexed — otherwise a hit would land on a page the reader hides.
  const pages = db
    .prepare(
      `SELECT p.id, p.page_no, p.source_text, b.slug, b.title, b.title_dv
         FROM book_pages p JOIN books b ON b.id = p.book_id
        WHERE b.published = 1 AND ${PUBLIC_PAGE_WHERE}`
    )
    .all() as {
    id: number; page_no: number; source_text: string; slug: string;
    title: string; title_dv: string;
  }[];

  const pageBlocks = db.prepare(
    "SELECT main, sub, ref FROM page_blocks WHERE page_id = ? ORDER BY sort"
  );

  for (const p of pages) {
    const blocks = pageBlocks.all(p.id) as { main: string; sub: string; ref: string }[];
    const body = [
      ...blocks.flatMap((b) => [b.main, b.sub, b.ref]),
      p.source_text,
    ]
      .filter(Boolean)
      .join("\n");
    if (!body.trim()) continue;
    const bookName = p.title_dv.trim() || p.title;
    add(
      "page",
      `${bookName} — ${p.page_no} ޞަފުޙާ`,
      body,
      bookName,
      `/library/${p.slug}?page=${p.page_no}`
    );
  }
}

/** Rebuilds the index if the underlying content has moved on since last time. */
function refreshIfStale() {
  const db = getDb();
  ensureTable();
  const sig = contentSignature();
  const current = db
    .prepare("SELECT value FROM settings WHERE key = 'search_signature'")
    .get() as { value: string } | undefined;

  if (current?.value === sig) return;

  db.transaction(() => {
    rebuild();
    db.prepare(
      `INSERT INTO settings (key, value) VALUES ('search_signature', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    ).run(sig);
  })();
}

/** Cuts a snippet from the original text around the first matching word. */
function snippetFor(rawBody: string, words: string[]): SearchHit["snippet"] {
  if (!rawBody) return null;
  const { text, map } = normalizeWithMap(rawBody);
  const haystack = text.toLowerCase();

  let at = -1;
  let hitWord = "";
  for (const w of words) {
    const found = haystack.indexOf(w.toLowerCase());
    if (found !== -1 && (at === -1 || found < at)) {
      at = found;
      hitWord = w;
    }
  }
  if (at === -1) return null;

  const start = map[at];
  const end = map[Math.min(at + hitWord.length, map.length - 1)] + 1;
  const RADIUS = 90;

  return {
    before: (start > RADIUS ? "… " : "") + rawBody.slice(Math.max(0, start - RADIUS), start),
    match: rawBody.slice(start, end),
    after:
      rawBody.slice(end, end + RADIUS) + (end + RADIUS < rawBody.length ? " …" : ""),
  };
}

export function search(rawQuery: string, limit = 24): SearchHit[] {
  const match = buildMatchQuery(rawQuery);
  if (!match) return [];

  refreshIfStale();
  const db = getDb();

  let rows: {
    kind: SearchKind; label: string; url: string;
    raw_title: string; raw_body: string;
  }[];
  try {
    rows = db
      .prepare(
        `SELECT kind, label, url, raw_title, raw_body
           FROM search_index
          WHERE search_index MATCH ?
          ORDER BY bm25(search_index, 12.0, 1.0) 
          LIMIT ?`
      )
      .all(match, limit) as typeof rows;
  } catch {
    // A malformed expression should return nothing, not break the page.
    return [];
  }

  const words = normalizeForSearch(rawQuery)
    .replace(FTS_SYNTAX, " ")
    .split(/\s+/)
    .filter(Boolean);

  return rows.map((r) => ({
    kind: r.kind,
    title: r.raw_title,
    label: r.label,
    url: r.url,
    snippet: snippetFor(r.raw_body, words),
  }));
}
