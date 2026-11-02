import "server-only";
import { getDb } from "./db";
import type { Block } from "./types";

export type PageStatus = "pending" | "translated";

/** Reviewer verdict on a translated page. */
export type PageApproval = "none" | "approved" | "rejected";

export type BookSource = "pdf" | "text";

/**
 * What a book is for: a translation project, or a file offered as-is.
 * A "file" book is complete the moment it is uploaded.
 */
export type BookKind = "translate" | "file";

export interface Book {
  id: number;
  slug: string;
  /** As catalogued, often Arabic for an imported book. */
  title: string;
  /** Dhivehi rendering shown to readers; empty until set. */
  titleDv: string;
  author: string;
  sourceType: BookSource;
  kind: BookKind;
  pdfPath: string;
  categoryId: number | null;
  published: boolean;
  description: string;
  cover: string;
  pageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BookPage {
  id: number;
  bookId: number;
  pageNo: number;
  sourceText: string;
  status: PageStatus;
  approval: PageApproval;
  approvalNote: string;
  approvedAt: string | null;
  translatedAt: string | null;
}

type BookRow = {
  id: number; slug: string; title: string; title_dv: string; author: string;
  source_type: string; kind: string; pdf_path: string; page_count: number;
  category_id: number | null; published: number; description: string | null;
  cover: string | null; created_at: string; updated_at: string;
};

const toBook = (r: BookRow): Book => ({
  id: r.id,
  slug: r.slug,
  title: r.title,
  titleDv: r.title_dv ?? "",
  author: r.author,
  sourceType: (r.source_type as BookSource) ?? "pdf",
  kind: r.kind === "file" ? "file" : "translate",
  pdfPath: r.pdf_path,
  categoryId: r.category_id ?? null,
  published: Boolean(r.published),
  description: r.description ?? "",
  cover: r.cover ?? "",
  pageCount: r.page_count,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

type PageRow = {
  id: number; book_id: number; page_no: number; source_text: string;
  status: string; approval: string | null; approval_note: string | null;
  approved_at: string | null; translated_at: string | null;
};

const toPage = (r: PageRow): BookPage => ({
  id: r.id,
  bookId: r.book_id,
  pageNo: r.page_no,
  sourceText: r.source_text,
  status: r.status as PageStatus,
  approval: (r.approval as PageApproval) ?? "none",
  approvalNote: r.approval_note ?? "",
  approvedAt: r.approved_at,
  translatedAt: r.translated_at,
});

export function getBooks(): (Book & { translated: number; approved: number })[] {
  return (
    getDb()
      .prepare(
        `SELECT b.*,
                (SELECT COUNT(*) FROM book_pages p
                  WHERE p.book_id = b.id AND p.status = 'translated') AS translated,
                (SELECT COUNT(*) FROM book_pages p
                  WHERE p.book_id = b.id AND p.approval = 'approved') AS approved
         FROM books b ORDER BY b.updated_at DESC`
      )
      .all() as (BookRow & { translated: number; approved: number })[]
  ).map((r) => ({ ...toBook(r), translated: r.translated, approved: r.approved }));
}

export function getBook(id: number): Book | undefined {
  const row = getDb().prepare("SELECT * FROM books WHERE id = ?").get(id) as
    | BookRow
    | undefined;
  return row ? toBook(row) : undefined;
}

export interface Chapter {
  id: number;
  bookId: number;
  /** As it appears in the source, usually Arabic. */
  title: string;
  /** Dhivehi rendering; empty until translated. */
  titleDv: string;
  startPage: number;
  level: number;
  sort: number;
}

export function getBookChapters(bookId: number): Chapter[] {
  const rows = getDb()
    .prepare(
      `SELECT id, book_id, title, title_dv, start_page, level, sort
       FROM book_chapters WHERE book_id = ?
       ORDER BY start_page, sort, id`
    )
    .all(bookId) as {
    id: number; book_id: number; title: string; title_dv: string;
    start_page: number; level: number; sort: number;
  }[];

  return rows.map((r) => ({
    id: r.id,
    bookId: r.book_id,
    title: r.title,
    titleDv: r.title_dv ?? "",
    startPage: r.start_page,
    level: r.level,
    sort: r.sort,
  }));
}

/**
 * The chapter a page falls in: the last one starting at or before it.
 * Returns null for pages before the first chapter marker.
 */
export function chapterForPage(chapters: Chapter[], pageNo: number): Chapter | null {
  let found: Chapter | null = null;
  for (const c of chapters) {
    if (c.startPage <= pageNo) found = c;
    else break;
  }
  return found;
}

/** Page span of each chapter, derived from the next chapter's start. */
export function chapterRanges(
  chapters: Chapter[],
  pageCount: number
): (Chapter & { endPage: number; pages: number })[] {
  return chapters.map((c, i) => {
    const endPage = i + 1 < chapters.length ? chapters[i + 1].startPage - 1 : pageCount;
    return { ...c, endPage, pages: Math.max(0, endPage - c.startPage + 1) };
  });
}

export function getBookPages(bookId: number): BookPage[] {
  return (
    getDb()
      .prepare("SELECT * FROM book_pages WHERE book_id = ? ORDER BY page_no")
      .all(bookId) as PageRow[]
  ).map(toPage);
}

export function getBookPage(bookId: number, pageNo: number): BookPage | undefined {
  const row = getDb()
    .prepare("SELECT * FROM book_pages WHERE book_id = ? AND page_no = ?")
    .get(bookId, pageNo) as PageRow | undefined;
  return row ? toPage(row) : undefined;
}

export function getPageBlocks(pageId: number): Block[] {
  const rows = getDb()
    .prepare("SELECT * FROM page_blocks WHERE page_id = ? ORDER BY sort, id")
    .all(pageId) as {
    id: number; page_id: number; sort: number; type: string; main: string;
    sub: string; ref: string; level: number; image: string; style: string;
  }[];

  return rows.map((r) => ({
    id: r.id,
    articleId: r.page_id,
    sort: r.sort,
    type: r.type as Block["type"],
    main: r.main,
    sub: r.sub,
    ref: r.ref,
    level: r.level,
    image: r.image,
    style: r.style ?? "",
  }));
}

/* ---------- public library ---------- */

export interface LibraryBook extends Book {
  categoryName: string;
  categorySlug: string;
}

const LIBRARY_SELECT = `
  SELECT b.*, c.name AS category_name, c.slug AS category_slug
  FROM books b LEFT JOIN categories c ON c.id = b.category_id
`;

type LibraryRow = BookRow & { category_name: string | null; category_slug: string | null };

const toLibrary = (r: LibraryRow): LibraryBook => ({
  ...toBook(r),
  categoryName: r.category_name ?? "",
  categorySlug: r.category_slug ?? "",
});

/**
 * What makes a page public: translated *and* approved. A translation that has
 * not been checked is not shown to readers.
 *
 * Kept here as one string because the reader, the library listing and the
 * search index must agree — if they drift, search surfaces a page the reader
 * then refuses to open. Expects `book_pages` aliased as `p`.
 */
export const PUBLIC_PAGE_WHERE = "p.status = 'translated' AND p.approval = 'approved'";

/**
 * A book earns a place in the library if there is something to do with it:
 * a file to download, or a translation to read. Requiring a PDF would hide
 * text-imported books that are fully translated.
 */
const HAS_SOMETHING = `(
  b.pdf_path <> ''
  OR EXISTS (
    SELECT 1 FROM book_pages p JOIN page_blocks pb ON pb.page_id = p.id
     WHERE p.book_id = b.id AND ${PUBLIC_PAGE_WHERE}
  )
)`;

/** Published books that are downloadable, readable, or both. */
export function getLibraryBooks(categorySlug?: string): LibraryBook[] {
  const where = `WHERE b.published = 1 AND ${HAS_SOMETHING}${
    categorySlug ? " AND c.slug = ?" : ""
  }`;
  const sql = `${LIBRARY_SELECT} ${where} ORDER BY b.updated_at DESC`;
  const stmt = getDb().prepare(sql);
  const rows = (categorySlug ? stmt.all(categorySlug) : stmt.all()) as LibraryRow[];
  return rows.map(toLibrary);
}

export function getLibraryBook(slug: string): LibraryBook | undefined {
  const row = getDb()
    .prepare(`${LIBRARY_SELECT} WHERE b.slug = ? AND b.published = 1 AND ${HAS_SOMETHING}`)
    .get(slug) as LibraryRow | undefined;
  return row ? toLibrary(row) : undefined;
}

/** Categories that have at least one published book, for the library filter. */
export function getLibraryCategories(): { slug: string; name: string; count: number }[] {
  return getDb()
    .prepare(
      `SELECT c.slug, c.name, COUNT(b.id) AS count
       FROM categories c JOIN books b ON b.category_id = c.id
       WHERE b.published = 1 AND ${HAS_SOMETHING}
       GROUP BY c.id ORDER BY c.sort, c.id`
    )
    .all() as { slug: string; name: string; count: number }[];
}

/** What a reader should see: the Dhivehi title when there is one. */
export function chapterLabel(c: { title: string; titleDv: string }): string {
  return c.titleDv.trim() || c.title;
}

/** Same rule for a book's own title. */
export function bookLabel(b: { title: string; titleDv: string }): string {
  return b.titleDv.trim() || b.title;
}
