import Database from "better-sqlite3";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { hashPassword } from "./password";

/**
 * Where the database lives.
 *
 * DATA_DIR is set in production to a path outside the directory the deploy
 * mirrors. Deriving it from cwd instead put the file inside that mirror, where
 * every deploy deleted it and the app silently re-seeded an empty database.
 */
export const DB_DIR = process.env.DATA_DIR?.trim() || path.join(process.cwd(), "data");

/**
 * Files that must never be reachable by URL — paid product files and the
 * payment slips buyers upload. Anything under public/ is served statically, so
 * a guessed name would hand out a paid file or a stranger's bank slip. These
 * are read back only through routes that check a token or a session.
 */
export const PRIVATE_DIR = path.join(DB_DIR, "private");
const DB_PATH = path.join(DB_DIR, "fighfoiy.db");

declare global {
  // Reused across dev hot reloads so we don't reopen the file on every request.
  var __fighfoiyDb: Database.Database | undefined;
}

function migrate(db: Database.Database) {
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      slug  TEXT NOT NULL UNIQUE,
      name  TEXT NOT NULL,
      sub   TEXT NOT NULL DEFAULT '',
      sort  INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS articles (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      slug         TEXT NOT NULL UNIQUE,
      title        TEXT NOT NULL,
      kicker       TEXT NOT NULL DEFAULT '',
      excerpt      TEXT NOT NULL DEFAULT '',
      category_id  INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
      author       TEXT NOT NULL DEFAULT '',
      status       TEXT NOT NULL DEFAULT 'draft',
      placement    TEXT NOT NULL DEFAULT 'none',
      image        TEXT NOT NULL DEFAULT '',
      views        INTEGER NOT NULL DEFAULT 0,
      -- Origin of an imported article, e.g. "wp:dhisalafiyyah.net:47059".
      source_ref   TEXT NOT NULL DEFAULT '',
      published_at TEXT,
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS blocks (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
      sort       INTEGER NOT NULL DEFAULT 0,
      type       TEXT NOT NULL,
      main       TEXT NOT NULL DEFAULT '',
      sub        TEXT NOT NULL DEFAULT '',
      ref        TEXT NOT NULL DEFAULT '',
      level      INTEGER NOT NULL DEFAULT 2,
      image      TEXT NOT NULL DEFAULT '',
      style      TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT NOT NULL UNIQUE,
      name          TEXT NOT NULL DEFAULT '',
      email         TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL DEFAULT 'editor',
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Sessions are server-side: the cookie carries a random token and the row
    -- stores only its SHA-256, so a database leak cannot be replayed as a login.
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS books (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      slug       TEXT NOT NULL UNIQUE,
      title      TEXT NOT NULL,
      title_dv   TEXT NOT NULL DEFAULT '',
      kind       TEXT NOT NULL DEFAULT 'translate',
      author     TEXT NOT NULL DEFAULT '',
      source_type TEXT NOT NULL DEFAULT 'pdf',
      pdf_path   TEXT NOT NULL DEFAULT '',
      -- Library fields. Books stay unpublished until an editor opts them in,
      -- so a translation source never leaks to the public site by default.
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      published   INTEGER NOT NULL DEFAULT 0,
      description TEXT NOT NULL DEFAULT '',
      cover       TEXT NOT NULL DEFAULT '',
      -- Provenance for imported books, e.g. "turath:7477"; blank when uploaded.
      source_ref  TEXT NOT NULL DEFAULT '',
      page_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- One row per page of the source PDF. source_text holds the extracted
    -- Arabic; the Dhivehi lives in page_blocks so it reuses the block editor.
    CREATE TABLE IF NOT EXISTS book_pages (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id       INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      page_no       INTEGER NOT NULL,
      source_text   TEXT NOT NULL DEFAULT '',
      status        TEXT NOT NULL DEFAULT 'pending',
      -- Review state, kept separate from status: a page can be translated but
      -- not yet checked, and a reviewer verdict is not a translation fact.
      approval      TEXT NOT NULL DEFAULT 'none',
      approval_note TEXT NOT NULL DEFAULT '',
      approved_at   TEXT,
      approved_by   INTEGER,
      translated_at TEXT,
      updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (book_id, page_no)
    );

    -- Chapters are markers, not containers: each records the page it starts on
    -- and a page's chapter is derived from that. Storing a chapter id on every
    -- page would mean rewriting hundreds of rows whenever a boundary moves.
    CREATE TABLE IF NOT EXISTS book_chapters (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id    INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      title      TEXT NOT NULL,
      title_dv   TEXT NOT NULL DEFAULT '',
      start_page INTEGER NOT NULL DEFAULT 1,
      level      INTEGER NOT NULL DEFAULT 1,
      sort       INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    /* Reader feedback on an article. Never shown publicly: the brief calls for
       entries visible only to editors, so there is no published flag to get
       wrong — nothing here is ever rendered on the site. */
    CREATE TABLE IF NOT EXISTS comments (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
      name       TEXT NOT NULL DEFAULT '',
      contact    TEXT NOT NULL DEFAULT '',
      body       TEXT NOT NULL,
      status     TEXT NOT NULL DEFAULT 'new',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    /* Questions sent in for an answer over Viber. */
    CREATE TABLE IF NOT EXISTS questions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL DEFAULT '',
      viber       TEXT NOT NULL,
      body        TEXT NOT NULL,
      status      TEXT NOT NULL DEFAULT 'new',
      answer      TEXT NOT NULL DEFAULT '',
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      answered_at TEXT
    );

    /* Study material sold as a download. */
    CREATE TABLE IF NOT EXISTS products (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      slug        TEXT NOT NULL UNIQUE,
      title       TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      price       INTEGER NOT NULL DEFAULT 0,
      file_path   TEXT NOT NULL DEFAULT '',
      cover       TEXT NOT NULL DEFAULT '',
      published   INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    /* An order awaiting a look at the transfer slip. There are no reader
       accounts, so the buyer is identified by the email they typed. */
    CREATE TABLE IF NOT EXISTS orders (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id   INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      buyer_name   TEXT NOT NULL DEFAULT '',
      buyer_email  TEXT NOT NULL,
      buyer_phone  TEXT NOT NULL DEFAULT '',
      slip_path    TEXT NOT NULL DEFAULT '',
      status       TEXT NOT NULL DEFAULT 'pending',
      note         TEXT NOT NULL DEFAULT '',
      token        TEXT NOT NULL DEFAULT '',
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      reviewed_at  TEXT
    );

    CREATE TABLE IF NOT EXISTS page_blocks (
      id      INTEGER PRIMARY KEY AUTOINCREMENT,
      page_id INTEGER NOT NULL REFERENCES book_pages(id) ON DELETE CASCADE,
      sort    INTEGER NOT NULL DEFAULT 0,
      type    TEXT NOT NULL,
      main    TEXT NOT NULL DEFAULT '',
      sub     TEXT NOT NULL DEFAULT '',
      ref     TEXT NOT NULL DEFAULT '',
      level   INTEGER NOT NULL DEFAULT 1,
      image   TEXT NOT NULL DEFAULT '',
      style   TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category_id);
    CREATE INDEX IF NOT EXISTS idx_articles_status   ON articles(status, published_at DESC);
    CREATE INDEX IF NOT EXISTS idx_blocks_article    ON blocks(article_id, sort);
    CREATE INDEX IF NOT EXISTS idx_sessions_user      ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_book_pages_book     ON book_pages(book_id, page_no);
    CREATE INDEX IF NOT EXISTS idx_page_blocks_page    ON page_blocks(page_id, sort);
    CREATE INDEX IF NOT EXISTS idx_chapters_book        ON book_chapters(book_id, start_page);
    CREATE INDEX IF NOT EXISTS idx_comments_article      ON comments(article_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_comments_status       ON comments(status, created_at);
    CREATE INDEX IF NOT EXISTS idx_questions_status      ON questions(status, created_at);
    CREATE INDEX IF NOT EXISTS idx_orders_status         ON orders(status, created_at);
    CREATE INDEX IF NOT EXISTS idx_products_published    ON products(published, created_at);
  `);

  addMissingColumns(db);
}

/**
 * Additive column migrations for databases created before a field existed.
 * CREATE TABLE IF NOT EXISTS silently skips an existing table, so new columns
 * have to be added explicitly.
 */
function addMissingColumns(db: Database.Database) {
  const columns = (table: string) =>
    (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map(
      (c) => c.name
    );

  if (!columns("blocks").includes("style")) {
    db.exec("ALTER TABLE blocks ADD COLUMN style TEXT NOT NULL DEFAULT ''");
  }

  if (!columns("books").includes("source_type")) {
    db.exec("ALTER TABLE books ADD COLUMN source_type TEXT NOT NULL DEFAULT 'pdf'");
  }

  // Engagement counters live on the article row: they are read on every page
  // render, and a join to count rows would cost more than it is worth.
  //
  // Each column is guarded on itself. Grouping them behind one check silently
  // skipped `likes`, because `views` already existed from an earlier schema.
  const articleCols = columns("articles");
  if (!articleCols.includes("views")) {
    db.exec("ALTER TABLE articles ADD COLUMN views INTEGER NOT NULL DEFAULT 0");
  }
  if (!articleCols.includes("likes")) {
    db.exec("ALTER TABLE articles ADD COLUMN likes INTEGER NOT NULL DEFAULT 0");
  }

  // Book and chapter titles arrive in the source language; the Dhivehi
  // rendering is stored beside the original rather than replacing it.
  // 'translate' books go through the translation pipeline; 'file' books are
  // published as a download and a preview, and are never "unfinished".
  if (!columns("books").includes("kind")) {
    db.exec("ALTER TABLE books ADD COLUMN kind TEXT NOT NULL DEFAULT 'translate'");
  }

  if (!columns("books").includes("title_dv")) {
    db.exec("ALTER TABLE books ADD COLUMN title_dv TEXT NOT NULL DEFAULT ''");
  }

  if (!columns("book_chapters").includes("title_dv")) {
    db.exec("ALTER TABLE book_chapters ADD COLUMN title_dv TEXT NOT NULL DEFAULT ''");
  }

  if (!columns("articles").includes("source_ref")) {
    db.exec("ALTER TABLE articles ADD COLUMN source_ref TEXT NOT NULL DEFAULT ''");
  }

  const bookCols = columns("books");
  if (!bookCols.includes("published")) {
    db.exec("ALTER TABLE books ADD COLUMN category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL");
    db.exec("ALTER TABLE books ADD COLUMN published INTEGER NOT NULL DEFAULT 0");
    db.exec("ALTER TABLE books ADD COLUMN description TEXT NOT NULL DEFAULT ''");
    db.exec("ALTER TABLE books ADD COLUMN cover TEXT NOT NULL DEFAULT ''");
  }

  if (!bookCols.includes("source_ref")) {
    db.exec("ALTER TABLE books ADD COLUMN source_ref TEXT NOT NULL DEFAULT ''");
  }

  const pageCols = columns("book_pages");
  if (!pageCols.includes("approval")) {
    db.exec("ALTER TABLE book_pages ADD COLUMN approval TEXT NOT NULL DEFAULT 'none'");
    db.exec("ALTER TABLE book_pages ADD COLUMN approval_note TEXT NOT NULL DEFAULT ''");
    db.exec("ALTER TABLE book_pages ADD COLUMN approved_at TEXT");
    db.exec("ALTER TABLE book_pages ADD COLUMN approved_by INTEGER");
  }
}

export function getDb(): Database.Database {
  if (global.__fighfoiyDb) return global.__fighfoiyDb;
  fs.mkdirSync(DB_DIR, { recursive: true });
  const db = new Database(DB_PATH);
  migrate(db);
  seed(db);
  seedAdmin(db);
  global.__fighfoiyDb = db;
  return db;
}

/**
 * Creates the initial admin the first time the app runs. There is no public
 * sign-up — further accounts are created from inside the admin panel.
 *
 * The password comes from ADMIN_PASSWORD when set; otherwise one is generated
 * and printed to the server console once, so no fixed default ever ships.
 */
function seedAdmin(db: Database.Database) {
  const { c } = db.prepare("SELECT COUNT(*) AS c FROM users").get() as { c: number };
  if (c > 0) return;

  const username = process.env.ADMIN_USERNAME?.trim() || "admin";
  const generated = !process.env.ADMIN_PASSWORD;
  const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(9).toString("base64url");

  db.prepare(
    `INSERT INTO users (username, name, email, password_hash, role)
     VALUES (?, ?, '', ?, 'admin')`
  ).run(username, "އެޑްމިން", hashPassword(password));

  if (generated) {
    console.warn(
      `\n[fighfoi] Created the initial admin account.\n` +
        `          username: ${username}\n` +
        `          password: ${password}\n` +
        `          Sign in at /login and change it from the admin panel.\n`
    );
  }
}

/** Populates a fresh database with the categories and sample articles. */
function seed(db: Database.Database) {
  const { c } = db.prepare("SELECT COUNT(*) AS c FROM categories").get() as { c: number };
  if (c > 0) return;

  const insertCat = db.prepare(
    "INSERT INTO categories (slug, name, sub, sort) VALUES (?, ?, ?, ?)"
  );
  const cats: [string, string, string][] = [
    ["fiqh", "ފިޤުހު", "އަޅުކަމާއި މުޢާމަލާތުގެ ޙުކުމްތައް", ],
    ["aqeedah", "ޢަޤީދާ", "އީމާންކަމުގެ އަސާސްތައް"],
    ["hadith", "ޙަދީޘް", "ސުންނަތުގެ ޢިލްމު"],
    ["tafseer", "ތަފްސީރު", "ޤުރުއާނުގެ މާނަ ބަޔާންކުރުން"],
    ["seerah", "ސީރަތު", "ރަސޫލާގެ ޙަޔާތްޕުޅު"],
    ["akhlaq", "އަޚްލާޤު", "ހެޔޮ ސުލޫކާއި ތަރުބިއްޔަތު"],
    ["fatwa", "ފަތުވާ", "ސުވާލާއި ޖަވާބު"],
  ].map((r) => [r[0], r[1], r[2] ?? ""] as [string, string, string]);

  cats.forEach((row, i) => insertCat.run(row[0], row[1], row[2], i));

  const catId = (slug: string) =>
    (db.prepare("SELECT id FROM categories WHERE slug = ?").get(slug) as { id: number }).id;

  const insertArticle = db.prepare(`
    INSERT INTO articles
      (slug, title, kicker, excerpt, category_id, author, status, placement, views, published_at)
    VALUES
      (@slug, @title, @kicker, @excerpt, @categoryId, @author, 'published', @placement, @views,
       datetime('now', @age))
  `);
  const insertBlock = db.prepare(`
    INSERT INTO blocks (article_id, sort, type, main, sub, ref, level)
    VALUES (@articleId, @sort, @type, @main, @sub, @ref, @level)
  `);

  type SeedBlock = Partial<{
    type: string; main: string; sub: string; ref: string; level: number;
  }>;

  const add = (
    a: {
      slug: string; title: string; kicker: string; excerpt: string; cat: string;
      author: string; placement: string; views: number; age: string;
    },
    blocks: SeedBlock[]
  ) => {
    const info = insertArticle.run({
      slug: a.slug, title: a.title, kicker: a.kicker, excerpt: a.excerpt,
      categoryId: catId(a.cat), author: a.author, placement: a.placement,
      views: a.views, age: a.age,
    });
    blocks.forEach((b, i) =>
      insertBlock.run({
        articleId: info.lastInsertRowid as number,
        sort: i,
        type: b.type ?? "text",
        main: b.main ?? "",
        sub: b.sub ?? "",
        ref: b.ref ?? "",
        level: b.level ?? 2,
      })
    );
  };

  add(
    {
      slug: "roadha-massha-hukumthah",
      title: "ރޯދައިގެ ޙުކުމްތަކާއި އޭގެ ޝަރުޠުތައް",
      kicker: "ފިޤުހު",
      excerpt:
        "ރޯދަ ވާޖިބުވާ މީހުންނާއި، ރޯދަ ޞައްޙަވުމުގެ ޝަރުޠުތަކާއި، ރޯދަ ގެއްލޭ ކަންކަމުގެ މައްޗަށް ޢިލްމުވެރިންގެ ބަސްފުޅުތަކުގެ އަލީގައި ބަލައިލުމެއް.",
      cat: "fiqh", author: "ޢަބްދުﷲ ޙަސަން", placement: "lead", views: 2410, age: "-2 hours",
    },
    [
      { type: "text", main: "ރޯދައަކީ އިސްލާމްކަމުގެ ފަސް ރުކުނުގެ ތެރެއިން ހަތަރުވަނަ ރުކުނެވެ. އެއީ ފަޖުރުލީއްސުރެ އިރުއޮއްސުމާ ހަމައަށް، ރޯދަ ގެއްލޭ ކަންކަމުން ދުރުހެލިވެ ހުރުމެވެ. މި ޢަމަލަކީ ﷲ ސުބްޙާނަހޫ ވަތަޢާލާ އަށްޓަކައި ކުރެވޭ ޚާލިޞް އަޅުކަމެކެވެ." },
      {
        type: "ayah", level: 1,
        main: "يَا أَيُّهَا الَّذِينَ آمَنُوا كُتِبَ عَلَيْكُمُ الصِّيَامُ كَمَا كُتِبَ عَلَى الَّذِينَ مِن قَبْلِكُمْ لَعَلَّكُمْ تَتَّقُونَ",
        sub: "އޭ އީމާންވެއްޖެ މީސްތަކުންނޭވެ! ތިޔަބައިމީހުންގެ ކުރީގެ މީސްތަކުންގެ މައްޗަށް ފަރުޟުކުރެއްވި ފަދައިން، ތިޔަބައިމީހުންގެ މައްޗަށްވެސް ރޯދަ ފަރުޟުކުރައްވައިފިއެވެ. އެއީ ތިޔަބައިމީހުން تقوى ވެރިވުމަށްޓަކައެވެ.",
        ref: "البقرة ١٨٣",
      },
      { type: "heading", level: 2, main: "ރޯދަ ވާޖިބުވާ ޝަރުޠުތައް" },
      {
        type: "list",
        main: "އިސްލާމްވުން\nބާލިޣުވުން\nބުއްދި ސަލާމަތުން ހުރުން\nރޯދަ ހިފުމުގެ ކުޅަދާނަކަން ލިބިފައިވުން\nދަތުރުވެރިއަކު ކަމުގައި ނުވުން",
      },
      {
        type: "hadith",
        main: "بُنِيَ الْإِسْلَامُ عَلَى خَمْسٍ",
        sub: "އިސްލާމްކަން ބިނާވެގެންވަނީ ފަސް ކަމެއްގެ މައްޗަށެވެ.",
        ref: "ބުޚާރީ 8، މުސްލިމް 16",
      },
      { type: "heading", level: 3, main: "ރޯދަ ގެއްލޭ ކަންކަން" },
      { type: "text", main: "ޤަޞްދުގައި ކައިބޮއެ ހެދުމާއި، ޖިމާޢުވުމާއި، ޤަޞްދުގައި ހޮޑުލެއްވުމަކީ ރޯދަ ގެއްލޭ ކަންކަމެވެ. ނަމަވެސް ހަނދާން ނެތިގެން ކައިބޮއެ ހެދިއްޖެނަމަ ރޯދަ ނުގެއްލޭނެ ކަމަށް ޖުމްހޫރު ޢިލްމުވެރިން ވިދާޅުވެއެވެ." },
      { type: "note", main: "މި ލިޔުމުގައި ބަޔާންކޮށްފައިވަނީ ޖުމްހޫރު ޢިލްމުވެރިންގެ ރައުޔެވެ. ތަފްޞީލީ މައްސަލަތަކުގައި ޢިލްމުވެރިއެއްގެ އިރުޝާދު ހޯއްދެވުން އެދެމެވެ." },
    ]
  );

  add(
    {
      slug: "thauheedhuge-baavaiythah",
      title: "ތައުޙީދުގެ ބާވަތްތަކާއި އޭގެ މުހިންމުކަން",
      kicker: "ޢަޤީދާ",
      excerpt: "ތައުޙީދު ރުބޫބިއްޔާ، އުލޫހިއްޔާ އަދި އަސްމާއު ވައްޞިފާތުގެ މާނަ ސާދާ ބަހުން.",
      cat: "aqeedah", author: "އިބްރާހީމް ރަޝީދު", placement: "secondary", views: 1870, age: "-6 hours",
    },
    [
      { type: "text", main: "ތައުޙީދަކީ ﷲ ސުބްޙާނަހޫ ވަތަޢާލާ އެއްކައުވަންތަކުރުމެވެ. ޢިލްމުވެރިން ތައުޙީދު ތިން ބަޔަކަށް ބައްސަވައެވެ." },
      { type: "list", main: "ތައުޙީދު ރުބޫބިއްޔާ\nތައުޙީދު އުލޫހިއްޔާ\nތައުޙީދު އަސްމާއު ވައްޞިފާތު" },
      { type: "divider" },
      { type: "text", main: "މި ތިން ބާވަތުގެ ތެރެއިން އެންމެ ބޮޑަށް ރަސޫލުބޭކަލުން ދަޢުވަތު ދެއްވީ ތައުޙީދު އުލޫހިއްޔާ އަށެވެ. އެއީ އަޅުކަން ﷲ އަށް އެކަނި ޚާލިޞްކުރުމެވެ." },
    ]
  );

  add(
    {
      slug: "hadhees-ilmuge-thaareekh",
      title: "ޙަދީޘް ޢިލްމުގެ ތާރީޚީ ތަރައްޤީ",
      kicker: "ޙަދީޘް",
      excerpt: "ޙަދީޘް ރިވާކުރުމާއި ލިޔެ ރައްކާކުރުމުގެ މަރުޙަލާތައް.",
      cat: "hadith", author: "ޢާއިޝަތު ނަހުލާ", placement: "secondary", views: 1320, age: "-11 hours",
    },
    [
      { type: "text", main: "ޙަދީޘް ޢިލްމަކީ ރަސޫލާ ޞައްލަﷲ ޢަލައިހި ވަސައްލަމަގެ ބަސްފުޅުތަކާއި ޢަމަލުފުޅުތައް ރައްކާތެރިކުރުމަށް އުފެދުނު ޢިލްމެކެވެ." },
      { type: "heading", level: 2, main: "ސަނަދުގެ މުހިންމުކަން" },
      { type: "text", main: "ސަނަދަކީ ޙަދީޘެއް ރިވާކުރެއްވި ބޭކަލުންގެ ސިލްސިލާއެވެ. އިސްލާމީ އުއްމަތުގެ ޚާއްޞަ ސިފައެއް ކަމުގައި ސަނަދު ބެލެވެއެވެ." },
    ]
  );

  add(
    {
      slug: "surah-fathiha-tafseer",
      title: "ސޫރަތުލް ފާތިޙާގެ ތަފްސީރު",
      kicker: "ތަފްސީރު",
      excerpt: "ޤުރުއާނުގެ އުއްމު ކަމުގައިވާ ސޫރަތުގެ މާނަ.",
      cat: "tafseer", author: "މުޙައްމަދު ޝާފިޢު", placement: "secondary", views: 990, age: "-1 day",
    },
    [
      {
        type: "ayah", level: 0,
        main: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ",
        sub: "ޙަމްދު ހުރީ ޢާލަމްތަކުގެ ވެރި ﷲ އަށެވެ.",
        ref: "الفاتحة ٢",
      },
      { type: "text", main: "މި ސޫރަތަކީ ކޮންމެ ނަމާދެއްގެ ކޮންމެ ރަކުޢަތެއްގައި ކިޔެވުން ވާޖިބު ސޫރަތެވެ." },
    ]
  );

  add(
    {
      slug: "hijra-dhathuru",
      title: "ހިޖުރައިގެ ދަތުރުފުޅުން ލިބޭ ފިލާވަޅުތައް",
      kicker: "ސީރަތު",
      excerpt: "މައްކާއިން މަދީނާއަށް ކުރެއްވި ދަތުރުފުޅުގެ ޢިބުރަތްތައް.",
      cat: "seerah", author: "ޢަބްދުﷲ ޙަސަން", placement: "pick", views: 2100, age: "-2 days",
    },
    [
      { type: "text", main: "ހިޖުރައަކީ އިސްލާމީ ތާރީޚުގެ އެންމެ މުހިންމު އެއް ޙާދިޘާއެވެ. އެ ދަތުރުފުޅުން ރޭވުންތެރިކަމާއި ތަވައްކުލްގެ ފުރިހަމަ މިސާލެއް ފެނިގެންދެއެވެ." },
      { type: "heading", level: 2, main: "ރޭވުންތެރިކަން" },
      { type: "text", main: "ރަސޫލާ ޞައްލަﷲ ޢަލައިހި ވަސައްލަމަ ދަތުރުފުޅު ރޭއްވެވީ ފުރިހަމަ ސިއްރިއްޔާތުގައެވެ. މިއިން ދޭހަވަނީ ސަބަބުތަކުގައި ހިފުމަކީ ތަވައްކުލާ ޚިލާފު ކަމެއް ނޫންކަމެވެ." },
    ]
  );

  add(
    {
      slug: "sabru-ge-fadhaail",
      title: "ކެތްތެރިކަމުގެ ދަރަޖައާއި ފަޟީލަތް",
      kicker: "އަޚްލާޤު",
      excerpt: "ދިރިއުޅުމުގެ އިމްތިޙާނުތަކުގައި ކެތްތެރިވުމުގެ މާތްކަން.",
      cat: "akhlaq", author: "ޢާއިޝަތު ނަހުލާ", placement: "pick", views: 1450, age: "-3 days",
    },
    [
      {
        type: "ayah", level: 1,
        main: "إِنَّمَا يُوَفَّى الصَّابِرُونَ أَجْرَهُم بِغَيْرِ حِسَابٍ",
        sub: "ކެތްތެރިންނަށް އެބައިމީހުންގެ ދަރުމަ ދެއްވާނީ ޙިސާބެއް ނެތިއެވެ.",
        ref: "الزمر ١٠",
      },
      { type: "text", main: "ކެތްތެރިކަން ބެހިގެންވަނީ ތިން ބަޔަކަށެވެ: އަޅުކަމުގައި ކެތްތެރިވުން، ފާފައިން ދުރުހެލިވުމުގައި ކެތްތެރިވުން، އަދި މުޞީބާތުގައި ކެތްތެރިވުމެވެ." },
    ]
  );

  add(
    {
      slug: "zakat-fithra-fathuwa",
      title: "ފިޠުރު ޒަކާތުގެ މިންވަރާ ބެހޭ ފަތުވާ",
      kicker: "ފަތުވާ",
      excerpt: "ފިޠުރު ޒަކާތުގެ ގޮތުގައި ދޭންޖެހޭ މިންވަރާއި، ދޭންވީ ވަގުތު.",
      cat: "fatwa", author: "މުޙައްމަދު ޝާފިޢު", placement: "none", views: 3200, age: "-4 days",
    },
    [
      { type: "text", main: "ފިޠުރު ޒަކާތަކީ ރަމަޟާން މަހުގެ ރޯދަ ފުރިހަމަކުރުމަށްފަހު، ޢީދު ނަމާދުގެ ކުރިން ދޭންޖެހޭ ޞަދަޤާތެކެވެ." },
      {
        type: "hadith",
        main: "فَرَضَ رَسُولُ اللَّهِ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ زَكَاةَ الْفِطْرِ",
        sub: "ރަސޫލުﷲ ޞައްލަﷲ ޢަލައިހި ވަސައްލަމަ ފިޠުރު ޒަކާތް ފަރުޟުކުރެއްވިއެވެ.",
        ref: "ބުޚާރީ 1503، މުސްލިމް 984",
      },
    ]
  );

  add(
    {
      slug: "namaadhu-jamaaaiy",
      title: "ޖަމާޢަތުގައި ނަމާދުކުރުމުގެ ޙުކުމް",
      kicker: "ފިޤުހު",
      excerpt: "ފިރިހެނުންގެ މައްޗަށް ޖަމާޢަތް ވާޖިބުތޯ ނުވަތަ ސުންނަތްތޯ.",
      cat: "fiqh", author: "އިބްރާހީމް ރަޝީދު", placement: "none", views: 2760, age: "-5 days",
    },
    [
      { type: "text", main: "ޖަމާޢަތުގައި ނަމާދުކުރުމުގެ ޙުކުމާ މެދު ޢިލްމުވެރިންގެ މެދުގައި ރައުޔު ތަފާތުވެފައިވެއެވެ." },
      { type: "list", main: "ފަރުޟު ޢައިން ކަމުގައި ބައެއް ބޭކަލުން ވިދާޅުވެއެވެ\nފަރުޟު ކިފާޔާ ކަމުގައި ބައެއް ބޭކަލުން ވިދާޅުވެއެވެ\nސުންނަތް މުއައްކަދާ ކަމުގައި ބައެއް ބޭކަލުން ވިދާޅުވެއެވެ" },
    ]
  );

  add(
    {
      slug: "waalidhunnah-ihusaantheri",
      title: "މައިންބަފައިންނަށް އިޙްސާންތެރިވުން",
      kicker: "އަޚްލާޤު",
      excerpt: "މައިންބަފައިންގެ ޙައްޤުތަކާއި، އެބައިމީހުންނަށް ހެޔޮކޮށް ހިތުމުގެ މާތްކަން.",
      cat: "akhlaq", author: "ޢަބްދުﷲ ޙަސަން", placement: "none", views: 1980, age: "-6 days",
    },
    [
      {
        type: "ayah", level: 1,
        main: "وَقَضَىٰ رَبُّكَ أَلَّا تَعْبُدُوا إِلَّا إِيَّاهُ وَبِالْوَالِدَيْنِ إِحْسَانًا",
        sub: "އަދި ކަލޭގެފާނުގެ ވެރިރަސްކަލާނގެ އަންގަވައި ނިޔާކުރެއްވިއެވެ. އެކަލާނގެއަށް މެނުވީ ތިޔަބައިމީހުން އަޅުކަން ނުކުރާށެވެ! އަދި މައިންބަފައިންނަށް އިޙްސާންތެރިވާށެވެ!",
        ref: "الإسراء ٢٣",
      },
      { type: "text", main: "މި އާޔަތުގައި ﷲ އަށް އަޅުކަންކުރުމާ ވިދިގެން މައިންބަފައިންނަށް އިޙްސާންތެރިވުން ބަޔާންކުރެއްވުމުން، އެކަމުގެ މުހިންމުކަން ދޭހަވެއެވެ." },
    ]
  );

  add(
    {
      slug: "quran-hifzukurumuge-adhabu",
      title: "ޤުރުއާން ހިތުދަސްކުރުމުގެ އަދަބުތައް",
      kicker: "ތަފްސީރު",
      excerpt: "ޤުރުއާން ހިތުދަސްކުރާ މީހާ ބަލަހައްޓަންޖެހޭ އަދަބުތަކާއި ސުލޫކު.",
      cat: "tafseer", author: "ޢާއިޝަތު ނަހުލާ", placement: "none", views: 1120, age: "-8 days",
    },
    [
      { type: "text", main: "ޤުރުއާން ހިތުދަސްކުރުމަކީ މާތްވެގެންވާ ޢަމަލެކެވެ. ނަމަވެސް އެއާއެކު އަދަބުތަކެއް ބަލަހައްޓަންޖެހެއެވެ." },
      { type: "note", main: "ހިތުދަސްކުރުމުގައި ދާއިމީކޮށް މުރާޖަޢާކުރުމަކީ އެންމެ މުހިންމު ކަންތަކެވެ." },
    ]
  );

  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(
    "site_title", "ފިޤުހު ފޮއި"
  );
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(
    "site_tagline", "ދިވެހި ދީނީ ޢިލްމީ ލިޔުންތައް"
  );
}
