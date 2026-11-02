import { getDb } from "./db";
import {
  type Chapter,
  type LibraryBook,
  chapterForPage,
  chapterLabel,
  PUBLIC_PAGE_WHERE,
  getBookChapters,
  getPageBlocks,
} from "./books";
import type { Block } from "./types";

/**
 * Server data for the reading view.
 *
 * Deliberately separate from the library queries: those require a PDF, because
 * the library lists files to download. A book can be fully translated without
 * ever having had a PDF — the text-import path produces exactly that — and such
 * a book is still readable.
 */

const READ_SELECT = `
  SELECT b.*, c.name AS category_name, c.slug AS category_slug
  FROM books b LEFT JOIN categories c ON c.id = b.category_id
`;

type ReadRow = {
  id: number; slug: string; title: string; title_dv: string; author: string;
  source_type: string; kind: string; pdf_path: string; page_count: number;
  category_id: number | null; published: number; description: string | null;
  cover: string | null; created_at: string; updated_at: string;
  category_name: string | null; category_slug: string | null;
};

const toBook = (r: ReadRow): LibraryBook => ({
  id: r.id,
  slug: r.slug,
  title: r.title,
  titleDv: r.title_dv ?? "",
  author: r.author,
  sourceType: r.source_type === "text" ? "text" : "pdf",
  kind: r.kind === "file" ? "file" : "translate",
  pdfPath: r.pdf_path,
  categoryId: r.category_id,
  published: !!r.published,
  description: r.description ?? "",
  cover: r.cover ?? "",
  pageCount: r.page_count,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  categoryName: r.category_name ?? "",
  categorySlug: r.category_slug ?? "",
});

/** A published book, whether or not it has a PDF behind it. */
export function getReadableBook(slug: string): LibraryBook | undefined {
  const row = getDb()
    .prepare(`${READ_SELECT} WHERE b.slug = ? AND b.published = 1`)
    .get(slug) as ReadRow | undefined;
  return row ? toBook(row) : undefined;
}

/** Page numbers a reader may open: translated, approved, and not empty. */
export function getReadablePageNumbers(bookId: number): number[] {
  const rows = getDb()
    .prepare(
      `SELECT DISTINCT p.page_no
         FROM book_pages p JOIN page_blocks pb ON pb.page_id = p.id
        WHERE p.book_id = ? AND ${PUBLIC_PAGE_WHERE}
        ORDER BY p.page_no`
    )
    .all(bookId) as { page_no: number }[];
  return rows.map((r) => r.page_no);
}

export interface ReaderPage {
  pageNo: number;
  blocks: Block[];
  chapter: Chapter | null;
  /** Neighbours among *readable* pages, so navigation skips untranslated gaps. */
  prevPage: number | null;
  nextPage: number | null;
  /** 1-based position within the readable pages, for the progress meter. */
  index: number;
  total: number;
}

export function getReaderPage(
  bookId: number,
  pageNo: number,
  readable: number[]
): ReaderPage | undefined {
  const row = getDb()
    .prepare("SELECT id FROM book_pages WHERE book_id = ? AND page_no = ?")
    .get(bookId, pageNo) as { id: number } | undefined;
  if (!row) return undefined;

  const at = readable.indexOf(pageNo);

  return {
    pageNo,
    blocks: getPageBlocks(row.id),
    chapter: chapterForPage(getBookChapters(bookId), pageNo),
    prevPage: at > 0 ? readable[at - 1] : null,
    nextPage: at !== -1 && at + 1 < readable.length ? readable[at + 1] : null,
    index: at + 1,
    total: readable.length,
  };
}

export interface TocEntry {
  id: number;
  title: string;
  level: number;
  startPage: number;
  /** Readable pages inside this chapter — a chapter with none is unread-able. */
  pageCount: number;
  /** Where to send the reader: the chapter's first *translated* page. */
  firstPage: number | null;
}

/** Chapters paired with the translated pages that fall inside them. */
export function getToc(bookId: number, readable: number[]): TocEntry[] {
  const chapters = getBookChapters(bookId);

  return chapters.map((c, i) => {
    const end =
      i + 1 < chapters.length ? chapters[i + 1].startPage - 1 : Number.MAX_SAFE_INTEGER;
    const inside = readable.filter((p) => p >= c.startPage && p <= end);
    return {
      id: c.id,
      // The Dhivehi rendering when it exists, else the source title.
      title: chapterLabel(c),
      level: c.level,
      startPage: c.startPage,
      pageCount: inside.length,
      firstPage: inside[0] ?? null,
    };
  });
}
