"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "./db";
import { requireUser } from "./auth";
import { encryptSecret } from "./secrets";
import { getGeminiKey, verifyGeminiKey } from "./gemini";
import { slugify } from "./utils-format";
import type { BlockType } from "./types";

function refreshPublic() {
  revalidatePath("/", "layout");
}

/* ---------- articles ---------- */

export async function createArticle() {
  await requireUser();
  const db = getDb();
  const cat = db.prepare("SELECT id FROM categories ORDER BY sort LIMIT 1").get() as
    | { id: number }
    | undefined;
  if (!cat) throw new Error("ބައެއް ނެތުމުން ލިޔުމެއް ނުއުފެއްދޭނެ");

  const info = db
    .prepare(
      `INSERT INTO articles (slug, title, category_id, author, status, placement)
       VALUES (?, ?, ?, '', 'draft', 'none')`
    )
    .run(`liyun-${Date.now().toString(36)}`, "ސުރުޚީ ނެތް ލިޔުމެއް", cat.id);

  const id = info.lastInsertRowid as number;
  db.prepare(
    "INSERT INTO blocks (article_id, sort, type, main) VALUES (?, 0, 'text', '')"
  ).run(id);

  revalidatePath("/admin/articles");
  redirect(`/admin/articles/${id}`);
}

export async function saveArticleMeta(formData: FormData) {
  await requireUser();
  const id = Number(formData.get("id"));
  const title = String(formData.get("title") ?? "").trim() || "ސުރުޚީ ނެތް ލިޔުމެއް";
  const slugInput = String(formData.get("slug") ?? "").trim();

  getDb()
    .prepare(
      `UPDATE articles SET
         title = ?, slug = ?, kicker = ?, excerpt = ?, category_id = ?,
         author = ?, image = ?, placement = ?, updated_at = datetime('now')
       WHERE id = ?`
    )
    .run(
      title,
      slugInput || slugify(title),
      String(formData.get("kicker") ?? ""),
      String(formData.get("excerpt") ?? ""),
      Number(formData.get("categoryId")),
      String(formData.get("author") ?? ""),
      String(formData.get("image") ?? ""),
      String(formData.get("placement") ?? "none"),
      id
    );

  revalidatePath(`/admin/articles/${id}`);
  revalidatePath("/admin/articles");
  refreshPublic();
}

export async function setArticleStatus(id: number, status: "draft" | "published") {
  await requireUser();
  getDb()
    .prepare(
      `UPDATE articles SET
         status = ?,
         published_at = CASE WHEN ? = 'published' AND published_at IS NULL
                             THEN datetime('now') ELSE published_at END,
         updated_at = datetime('now')
       WHERE id = ?`
    )
    .run(status, status, id);

  revalidatePath(`/admin/articles/${id}`);
  revalidatePath("/admin/articles");
  refreshPublic();
}

export async function deleteArticle(id: number) {
  await requireUser();
  getDb().prepare("DELETE FROM articles WHERE id = ?").run(id);
  revalidatePath("/admin/articles");
  refreshPublic();
  redirect("/admin/articles");
}

/* ---------- blocks ---------- */

/** Replaces an article's blocks wholesale — the editor posts the full ordered list. */
export async function saveBlocks(
  articleId: number,
  blocks: {
    type: BlockType;
    main: string;
    sub: string;
    ref: string;
    level: number;
    image: string;
    style: string;
  }[]
) {
  await requireUser();
  const db = getDb();
  const write = db.transaction(() => {
    db.prepare("DELETE FROM blocks WHERE article_id = ?").run(articleId);
    const insert = db.prepare(
      `INSERT INTO blocks (article_id, sort, type, main, sub, ref, level, image, style)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    blocks.forEach((b, i) =>
      insert.run(articleId, i, b.type, b.main, b.sub, b.ref, b.level, b.image, b.style)
    );
    db.prepare("UPDATE articles SET updated_at = datetime('now') WHERE id = ?").run(
      articleId
    );
  });
  write();

  revalidatePath(`/admin/articles/${articleId}`);
  refreshPublic();
}

/* ---------- categories ---------- */

export async function createCategory(formData: FormData) {
  await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const slug = String(formData.get("slug") ?? "").trim() || slugify(name);
  const db = getDb();
  const max = db.prepare("SELECT COALESCE(MAX(sort), -1) AS m FROM categories").get() as {
    m: number;
  };
  db.prepare("INSERT INTO categories (slug, name, sub, sort) VALUES (?, ?, ?, ?)").run(
    slug,
    name,
    String(formData.get("sub") ?? ""),
    max.m + 1
  );
  revalidatePath("/admin/categories");
  refreshPublic();
}

export async function updateCategory(formData: FormData) {
  await requireUser();
  const id = Number(formData.get("id"));
  getDb()
    .prepare("UPDATE categories SET name = ?, slug = ?, sub = ?, sort = ? WHERE id = ?")
    .run(
      String(formData.get("name") ?? ""),
      String(formData.get("slug") ?? ""),
      String(formData.get("sub") ?? ""),
      Number(formData.get("sort") ?? 0),
      id
    );
  revalidatePath("/admin/categories");
  refreshPublic();
}

export async function deleteCategory(id: number) {
  await requireUser();
  const db = getDb();
  const used = db
    .prepare("SELECT COUNT(*) AS c FROM articles WHERE category_id = ?")
    .get(id) as { c: number };
  // RESTRICT would throw; surface a readable message to the form instead.
  if (used.c > 0) return { error: "މި ބައިގައި ލިޔުންތައް ހުރުމުން ނުފޮހެވޭނެ" };
  db.prepare("DELETE FROM categories WHERE id = ?").run(id);
  revalidatePath("/admin/categories");
  refreshPublic();
  return { error: null };
}

/* ---------- settings ---------- */

export async function saveSettings(formData: FormData) {
  await requireUser();
  const db = getDb();
  const put = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
  put.run("site_title", String(formData.get("site_title") ?? ""));
  put.run("site_tagline", String(formData.get("site_tagline") ?? ""));
  revalidatePath("/admin/settings");
  refreshPublic();
}

/**
 * Contact details, the Telegram channel and the Zakat nisab.
 *
 * The nisab is typed in rather than fetched: the Ministry publishes it as prose
 * on a page, and a scraper would fail quietly and leave a stale figure showing
 * as current. The publication date is stored with it so readers can see how
 * fresh it is, and an empty amount simply hides the widget.
 */
export async function savePublicSettings(formData: FormData) {
  await requireUser();
  const db = getDb();
  const put = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");

  const field = (name: string, max = 500) =>
    String(formData.get(name) ?? "").trim().slice(0, max);

  put.run("contact_email", field("contact_email", 160));
  put.run("telegram_channel", field("telegram_channel", 80).replace(/^@/, ""));
  put.run("about_text", field("about_text", 4000));
  // Stored as a plain number: the card formats it and the calculator uses it,
  // so there is no second, free-text copy of the figure to fall out of step.
  const nisab = Number(String(formData.get("zakat_amount") ?? "").replace(/[^\d.]/g, ""));
  put.run("zakat_amount", Number.isFinite(nisab) && nisab > 0 ? String(nisab) : "");
  put.run("zakat_updated", field("zakat_updated", 40));
  put.run("zakat_note", field("zakat_note", 300));
  put.run("zakat_source", field("zakat_source", 300));
  put.run("bank_details", field("bank_details", 600));

  revalidatePath("/admin/settings");
  refreshPublic();
}

/* ---------- integrations ---------- */

export interface KeyFormState {
  error: string | null;
  ok: string | null;
}

/**
 * Stores the Gemini key from the admin panel. The key is verified against the
 * API before it is saved, so a typo is caught here rather than at translate
 * time, and it is encrypted at rest.
 */
export async function saveGeminiKey(
  _prev: KeyFormState,
  formData: FormData
): Promise<KeyFormState> {
  const me = await requireUser();
  if (me.role !== "admin") return { error: "ހުއްދައެއް ނެތެވެ", ok: null };

  const key = String(formData.get("key") ?? "").trim();
  const model = String(formData.get("model") ?? "").trim();
  const db = getDb();
  const put = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");

  if (model) put.run("gemini_model", model);

  // An empty key field with a model change means "just update the model".
  if (!key) {
    revalidatePath("/admin/settings");
    return model
      ? { error: null, ok: "މޮޑެލް ރައްކާކުރެވިއްޖެ" }
      : { error: "ކީއެއް ލިޔުއްވާ", ok: null };
  }

  const check = await verifyGeminiKey(key);
  if (!check.ok) {
    return { error: `ކީ ބަލައިނުގަނެވުނު — ${check.error ?? ""}`, ok: null };
  }

  put.run("gemini_api_key", encryptSecret(key));
  revalidatePath("/admin/settings");
  revalidatePath("/admin/books");
  return { error: null, ok: "Gemini ކީ ރައްކާކުރެވިއްޖެ" };
}

export async function clearGeminiKey() {
  const me = await requireUser();
  if (me.role !== "admin") return { error: "ހުއްދައެއް ނެތެވެ" };

  getDb().prepare("DELETE FROM settings WHERE key = ?").run("gemini_api_key");
  revalidatePath("/admin/settings");
  revalidatePath("/admin/books");
  return { error: null };
}

/** Re-checks whatever key is currently in force. */
export async function testGeminiKey(): Promise<KeyFormState> {
  await requireUser();
  const key = getGeminiKey();
  if (!key) return { error: "ކީއެއް ސެޓުކުރައްވާފައި ނެތެވެ", ok: null };

  const check = await verifyGeminiKey(key);
  return check.ok
    ? { error: null, ok: "ކީ މަސައްކަތްކުރެއެވެ" }
    : { error: check.error ?? "ކީ މަސައްކަތެއް ނުކުރޭ", ok: null };
}
