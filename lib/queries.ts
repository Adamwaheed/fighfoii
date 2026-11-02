import "server-only";
import { getDb } from "./db";
import type {
  Article,
  ArticleWithCategory,
  Block,
  Category,
  Placement,
} from "./types";

/* ---------- row mappers ---------- */

type ArticleRow = {
  id: number; slug: string; title: string; kicker: string; excerpt: string;
  category_id: number; author: string; status: string; placement: string;
  image: string; views: number; published_at: string | null;
  created_at: string; updated_at: string;
  category_name?: string; category_slug?: string;
};

function toArticle(r: ArticleRow): ArticleWithCategory {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    kicker: r.kicker,
    excerpt: r.excerpt,
    categoryId: r.category_id,
    author: r.author,
    status: r.status as Article["status"],
    placement: r.placement as Placement,
    image: r.image,
    views: r.views,
    publishedAt: r.published_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    categoryName: r.category_name ?? "",
    categorySlug: r.category_slug ?? "",
  };
}

type BlockRow = {
  id: number; article_id: number; sort: number; type: string;
  main: string; sub: string; ref: string; level: number; image: string;
  style: string;
};

function toBlock(r: BlockRow): Block {
  return {
    id: r.id,
    articleId: r.article_id,
    sort: r.sort,
    type: r.type as Block["type"],
    main: r.main,
    sub: r.sub,
    ref: r.ref,
    level: r.level,
    image: r.image,
    style: r.style ?? "",
  };
}

const SELECT_ARTICLE = `
  SELECT a.*, c.name AS category_name, c.slug AS category_slug
  FROM articles a JOIN categories c ON c.id = a.category_id
`;

/* ---------- categories ---------- */

export function getCategories(): Category[] {
  return getDb()
    .prepare("SELECT * FROM categories ORDER BY sort, id")
    .all() as Category[];
}

export function getCategoryBySlug(slug: string): Category | undefined {
  return getDb()
    .prepare("SELECT * FROM categories WHERE slug = ?")
    .get(slug) as Category | undefined;
}

/** Category list with a published-article count, for the admin table. */
export function getCategoriesWithCounts(): (Category & { count: number })[] {
  return getDb()
    .prepare(
      `SELECT c.*, (SELECT COUNT(*) FROM articles a WHERE a.category_id = c.id) AS count
       FROM categories c ORDER BY c.sort, c.id`
    )
    .all() as (Category & { count: number })[];
}

/* ---------- articles (public) ---------- */

export function getPublished(limit = 50, offset = 0): ArticleWithCategory[] {
  return (
    getDb()
      .prepare(
        `${SELECT_ARTICLE} WHERE a.status = 'published'
         ORDER BY a.published_at DESC LIMIT ? OFFSET ?`
      )
      .all(limit, offset) as ArticleRow[]
  ).map(toArticle);
}

export function getByPlacement(placement: Placement, limit = 10): ArticleWithCategory[] {
  return (
    getDb()
      .prepare(
        `${SELECT_ARTICLE} WHERE a.status = 'published' AND a.placement = ?
         ORDER BY a.published_at DESC LIMIT ?`
      )
      .all(placement, limit) as ArticleRow[]
  ).map(toArticle);
}

/**
 * The newest published article from each category, newest first.
 *
 * One per category rather than simply the latest N, so the panel stays varied
 * instead of filling with several pieces from whichever category was updated
 * last. Being derived from publish dates, it never goes stale the way a
 * hand-assigned placement does.
 */
export function getRecentPerCategory(
  limit = 3,
  excludeIds: number[] = []
): ArticleWithCategory[] {
  const rows = getDb()
    .prepare(
      `SELECT a.*, c.name AS category_name, c.slug AS category_slug
       FROM articles a
       JOIN categories c ON c.id = a.category_id
       WHERE a.status = 'published'
         AND a.published_at = (
           SELECT MAX(b.published_at) FROM articles b
           WHERE b.category_id = a.category_id AND b.status = 'published'
         )
       ORDER BY a.published_at DESC`
    )
    .all() as ArticleRow[];

  const skip = new Set(excludeIds);
  const seen = new Set<number>();
  const out: ArticleWithCategory[] = [];

  for (const row of rows) {
    // MAX() can tie when two articles share a timestamp; keep one per category.
    if (skip.has(row.id) || seen.has(row.category_id)) continue;
    seen.add(row.category_id);
    out.push(toArticle(row));
    if (out.length >= limit) break;
  }
  return out;
}

export function getPopular(limit = 5): ArticleWithCategory[] {
  return (
    getDb()
      .prepare(
        `${SELECT_ARTICLE} WHERE a.status = 'published'
         ORDER BY a.views DESC LIMIT ?`
      )
      .all(limit) as ArticleRow[]
  ).map(toArticle);
}

export function getByCategory(slug: string, limit = 30): ArticleWithCategory[] {
  return (
    getDb()
      .prepare(
        `${SELECT_ARTICLE} WHERE a.status = 'published' AND c.slug = ?
         ORDER BY a.published_at DESC LIMIT ?`
      )
      .all(slug, limit) as ArticleRow[]
  ).map(toArticle);
}

export function getArticleBySlug(slug: string): ArticleWithCategory | undefined {
  const row = getDb().prepare(`${SELECT_ARTICLE} WHERE a.slug = ?`).get(slug) as
    | ArticleRow
    | undefined;
  return row ? toArticle(row) : undefined;
}

export function getRelated(
  categoryId: number,
  excludeId: number,
  limit = 4
): ArticleWithCategory[] {
  return (
    getDb()
      .prepare(
        `${SELECT_ARTICLE} WHERE a.status = 'published' AND a.category_id = ? AND a.id != ?
         ORDER BY a.published_at DESC LIMIT ?`
      )
      .all(categoryId, excludeId, limit) as ArticleRow[]
  ).map(toArticle);
}

/** Every published article grouped under its category, for the front-page sections. */
export function getSections(perSection = 3): {
  category: Category;
  items: ArticleWithCategory[];
}[] {
  return getCategories()
    .map((category) => ({
      category,
      items: getByCategory(category.slug, perSection),
    }))
    .filter((s) => s.items.length > 0);
}

/* ---------- articles (admin) ---------- */

export function getAllArticles(): ArticleWithCategory[] {
  return (
    getDb()
      .prepare(`${SELECT_ARTICLE} ORDER BY a.updated_at DESC`)
      .all() as ArticleRow[]
  ).map(toArticle);
}

export function getArticleById(id: number): ArticleWithCategory | undefined {
  const row = getDb().prepare(`${SELECT_ARTICLE} WHERE a.id = ?`).get(id) as
    | ArticleRow
    | undefined;
  return row ? toArticle(row) : undefined;
}

export function getBlocks(articleId: number): Block[] {
  return (
    getDb()
      .prepare("SELECT * FROM blocks WHERE article_id = ? ORDER BY sort, id")
      .all(articleId) as BlockRow[]
  ).map(toBlock);
}

export function getStats() {
  const db = getDb();
  const one = (sql: string, ...p: unknown[]) =>
    (db.prepare(sql).get(...p) as { v: number }).v;
  return {
    published: one("SELECT COUNT(*) AS v FROM articles WHERE status = 'published'"),
    drafts: one("SELECT COUNT(*) AS v FROM articles WHERE status = 'draft'"),
    categories: one("SELECT COUNT(*) AS v FROM categories"),
    views: one("SELECT COALESCE(SUM(views), 0) AS v FROM articles"),
  };
}

/* ---------- settings ---------- */

export function getSettings(): Record<string, string> {
  const rows = getDb().prepare("SELECT key, value FROM settings").all() as {
    key: string;
    value: string;
  }[];
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}
