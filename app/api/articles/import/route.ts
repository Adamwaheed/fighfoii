import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { fetchWpArticle } from "@/lib/wp-import";
import { slugify } from "@/lib/utils-format";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Imports one WordPress article into a new draft. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "ވަދެވަޑައިގަންނަވާ" }, { status: 401 });

  const { url } = (await request.json()) as { url?: string };
  if (!url?.trim()) {
    return NextResponse.json({ error: "ލިންކު ލިޔުއްވާ" }, { status: 400 });
  }

  let article;
  try {
    article = await fetchWpArticle(url);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "ލިޔުން ނުލިބުނު" },
      { status: 502 }
    );
  }

  const db = getDb();
  const host = (() => {
    try {
      return new URL(article.sourceUrl).hostname;
    } catch {
      return "wp";
    }
  })();
  const ref = `wp:${host}:${article.sourceId}`;

  const existing = db
    .prepare("SELECT id FROM articles WHERE source_ref = ?")
    .get(ref) as { id: number } | undefined;
  if (existing) {
    return NextResponse.json(
      { error: "މި ލިޔުން ކުރިންވެސް އިމްޕޯޓްކުރެވިފައިވެއެވެ", articleId: existing.id },
      { status: 409 }
    );
  }

  const category = db
    .prepare("SELECT id FROM categories ORDER BY sort LIMIT 1")
    .get() as { id: number } | undefined;
  if (!category) {
    return NextResponse.json({ error: "ބައެއް ނެތެވެ" }, { status: 422 });
  }

  // Imported articles land as drafts. Someone else's words should not go live
  // on this site without a person reading them first.
  const info = db
    .prepare(
      `INSERT INTO articles
         (slug, title, kicker, excerpt, category_id, author, status, placement, image, source_ref)
       VALUES (?, ?, '', ?, ?, '', 'draft', 'none', ?, ?)`
    )
    .run(
      `${slugify(article.title)}-${Date.now().toString(36)}`,
      article.title,
      article.excerpt,
      category.id,
      article.cover,
      ref
    );

  const articleId = info.lastInsertRowid as number;

  const insert = db.prepare(
    `INSERT INTO blocks (article_id, sort, type, main, sub, ref, level, image)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  db.transaction(() => {
    article.blocks.forEach((b, i) =>
      insert.run(articleId, i, b.type, b.main, b.sub, b.ref, b.level, b.image)
    );
  })();

  return NextResponse.json({
    id: articleId,
    title: article.title,
    blockCount: article.blocks.length,
  });
}
