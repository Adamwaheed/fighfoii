import { getDb } from "./db";

/**
 * View and like counters, plus the two reader-submitted forms.
 *
 * Counters are deliberately crude: one row update, no per-visitor table. The
 * browser decides whether an event is worth sending (once per article per day
 * for a view, once ever for a like), which keeps the database small and means
 * nothing identifying about a reader is stored here at all.
 */

export interface Counts {
  views: number;
  likes: number;
}

export function getCounts(articleId: number): Counts {
  const row = getDb()
    .prepare("SELECT views, likes FROM articles WHERE id = ?")
    .get(articleId) as Counts | undefined;
  return { views: row?.views ?? 0, likes: row?.likes ?? 0 };
}

export function recordView(slug: string): Counts | null {
  const db = getDb();
  const row = db
    .prepare("SELECT id FROM articles WHERE slug = ? AND status = 'published'")
    .get(slug) as { id: number } | undefined;
  if (!row) return null;

  db.prepare("UPDATE articles SET views = views + 1 WHERE id = ?").run(row.id);
  return getCounts(row.id);
}

/** `delta` is +1 or -1, so a reader can take a like back. */
export function recordLike(slug: string, delta: 1 | -1): Counts | null {
  const db = getDb();
  const row = db
    .prepare("SELECT id FROM articles WHERE slug = ? AND status = 'published'")
    .get(slug) as { id: number } | undefined;
  if (!row) return null;

  // Clamped at zero: a stale "unlike" must not push the count negative.
  db.prepare("UPDATE articles SET likes = max(0, likes + ?) WHERE id = ?").run(
    delta,
    row.id
  );
  return getCounts(row.id);
}

/* ── Comments ───────────────────────────────────────────────────────────── */

export interface Comment {
  id: number;
  articleId: number;
  articleTitle: string;
  articleSlug: string;
  name: string;
  contact: string;
  body: string;
  status: "new" | "read" | "archived";
  createdAt: string;
}

export function addComment(input: {
  slug: string;
  name: string;
  contact: string;
  body: string;
}): { error: string | null } {
  const body = input.body.trim();
  if (body.length < 3) return { error: "ޚިޔާލު ލިޔުއްވާ" };
  if (body.length > 4000) return { error: "ޚިޔާލު ދިގުވެއްޖެ" };

  const db = getDb();
  const article = db
    .prepare("SELECT id FROM articles WHERE slug = ? AND status = 'published'")
    .get(input.slug) as { id: number } | undefined;
  if (!article) return { error: "ލިޔުމެއް ނުފެނުނު" };

  db.prepare(
    "INSERT INTO comments (article_id, name, contact, body) VALUES (?, ?, ?, ?)"
  ).run(article.id, input.name.trim().slice(0, 120), input.contact.trim().slice(0, 160), body);

  return { error: null };
}

export function listComments(status?: string): Comment[] {
  const where = status && status !== "all" ? "WHERE c.status = ?" : "";
  const sql = `
    SELECT c.id, c.article_id, c.name, c.contact, c.body, c.status, c.created_at,
           a.title AS article_title, a.slug AS article_slug
      FROM comments c JOIN articles a ON a.id = c.article_id
      ${where}
     ORDER BY c.created_at DESC`;

  const stmt = getDb().prepare(sql);
  const rows = (status && status !== "all" ? stmt.all(status) : stmt.all()) as {
    id: number; article_id: number; name: string; contact: string; body: string;
    status: string; created_at: string; article_title: string; article_slug: string;
  }[];

  return rows.map((r) => ({
    id: r.id,
    articleId: r.article_id,
    articleTitle: r.article_title,
    articleSlug: r.article_slug,
    name: r.name,
    contact: r.contact,
    body: r.body,
    status: r.status as Comment["status"],
    createdAt: r.created_at,
  }));
}

/* ── Questions ──────────────────────────────────────────────────────────── */

export interface Question {
  id: number;
  name: string;
  viber: string;
  body: string;
  status: "new" | "answered" | "closed";
  answer: string;
  createdAt: string;
  answeredAt: string | null;
}

/** Maldivian numbers are 7 digits; an international form is allowed too. */
export function normalisePhone(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, "");
  const bare = digits.replace(/^\+?960/, "");
  if (/^\d{7}$/.test(bare)) return bare;
  if (/^\+\d{8,15}$/.test(digits)) return digits;
  return null;
}

export function addQuestion(input: {
  name: string;
  viber: string;
  body: string;
}): { error: string | null } {
  const body = input.body.trim();
  if (body.length < 5) return { error: "ސުވާލު ލިޔުއްވާ" };
  if (body.length > 4000) return { error: "ސުވާލު ދިގުވެއްޖެ" };

  const viber = normalisePhone(input.viber);
  if (!viber) return { error: "ވައިބަރ ނަންބަރު ރަނގަޅަށް ލިޔުއްވާ" };

  getDb()
    .prepare("INSERT INTO questions (name, viber, body) VALUES (?, ?, ?)")
    .run(input.name.trim().slice(0, 120), viber, body);

  return { error: null };
}

export function listQuestions(status?: string): Question[] {
  const where = status && status !== "all" ? "WHERE status = ?" : "";
  const stmt = getDb().prepare(
    `SELECT id, name, viber, body, status, answer, created_at, answered_at
       FROM questions ${where} ORDER BY created_at DESC`
  );
  const rows = (status && status !== "all" ? stmt.all(status) : stmt.all()) as {
    id: number; name: string; viber: string; body: string; status: string;
    answer: string; created_at: string; answered_at: string | null;
  }[];

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    viber: r.viber,
    body: r.body,
    status: r.status as Question["status"],
    answer: r.answer,
    createdAt: r.created_at,
    answeredAt: r.answered_at,
  }));
}

/** Unhandled counts, for the badge on the admin sidebar. */
export function inboxCounts(): { comments: number; questions: number; orders: number } {
  const db = getDb();
  const one = (sql: string) => (db.prepare(sql).get() as { c: number }).c;
  return {
    comments: one("SELECT count(*) c FROM comments WHERE status = 'new'"),
    questions: one("SELECT count(*) c FROM questions WHERE status = 'new'"),
    orders: one("SELECT count(*) c FROM orders WHERE status = 'pending'"),
  };
}
