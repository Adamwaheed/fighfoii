# ފިޤުހު ފޮއި — Fiqhu Foi

A right-to-left Next.js publication and CMS for Dhivehi religious writing, built from the
`Fiqhu Foi.html` design template.

## Two surfaces

| Surface | Route | What it is |
| --- | --- | --- |
| Public site | `/`, `/category/[slug]`, `/article/[slug]` | The reader-facing paper, styled exactly to the template |
| CMS | `/admin`, `/admin/articles`, `/admin/categories`, `/admin/settings` | shadcn `sidebar-07` shell, localised to Dhivehi |

## Right-to-left

RTL is set at the root (`<html lang="dv" dir="rtl">`) and carried through consistently:

- shadcn was initialised with its `--rtl` flag, so its components use logical
  properties (`ms-*`, `pe-*`, `text-start`) rather than physical ones.
- The admin tree is wrapped in Radix's `DirectionProvider dir="rtl"` so menus,
  dropdowns and keyboard navigation flip too.
- The sidebar positions itself with physical edges, so it is mounted with
  `side="right"` to sit on the reading-start edge.
- Where the template used `border-right` inside an RTL document, that is the
  *start* edge — those became `border-s-*` / `ps-*`, not `border-e-*`.

## Typography

Four faces are self-hosted from the template bundle via `next/font/local`
(`lib/fonts.ts`) — no external font requests:

| Token | Face | Used for |
| --- | --- | --- |
| `font-heading` | A_Waheed | Thaana headlines, masthead |
| `font-sans` | AK Rasmee | Thaana body copy and UI |
| `font-arabic` | Amiri | Hadith matn, citations, ornaments |
| `font-quran` | Amiri Quran | Qur'anic ayah text only |

Thaana needs far more leading than Latin; the base line-height is 1.9, and
reader copy runs to 2.3, matching the template.

## Content model

Articles are composed of ordered **blocks**, mirroring the template's editor:

`text` · `heading` (H2/H3) · `ayah` (framed or plain) · `hadith` · `image` ·
`list` · `note` · `divider`

Ayah and hadith blocks carry Arabic text, a Dhivehi translation, and a citation.
The CMS preview renders blocks through the same `BlockList` component the public
reader uses, so preview and published output cannot drift.

## Authentication

There is **no public sign-up**. `/login` only signs people in; accounts are
created from inside the panel at `/admin/users` (admins only).

The first admin is seeded the first time the database is created:

- Set `ADMIN_USERNAME` / `ADMIN_PASSWORD` before first run to choose it, or
- leave them unset and a random password is generated and printed to the server
  console once — so no fixed default password ever ships.

Passwords are scrypt-hashed with a per-user salt and compared in constant time.
Sessions are server-side: the cookie holds a random token and the database
stores only its SHA-256, so a leaked database cannot be replayed as a login.
Failed sign-ins are throttled per username.

Everything under `/admin` is gated in the admin layout, and **every server
action calls `requireUser()` independently** — a layout redirect only protects
rendering, and action endpoints are reachable directly over POST.

## Writing

The article editor has two modes, toggled in its toolbar:

- **ޞަފުޙާގައި (page)** — the default. The article is laid out exactly as it
  will publish, and every text run is directly editable in place. Structural
  controls (move, delete) appear on hover at the edge of each block, and an
  insert strip between blocks adds new ones.
- **ބްލޮކް (blocks)** — the form-based view, one card per block, for when you
  want to see the raw fields (ayah references, image URLs, heading levels).

Both modes edit the same state and save through the same actions.

## Images

Article and block images are uploaded through the editor rather than pasted as
URLs (a URL field is still there as a fallback).

Picking a file opens a crop dialog with free / 16:9 / 3:2 / 4:3 / 1:1 ratios.
The crop is rasterised on a canvas and sent as WebP, so a large phone photo
leaves the browser already small; `/api/upload` then re-encodes with sharp:
EXIF orientation applied, all metadata stripped (GPS included), capped at
1600px wide, WebP q78. A 2.3MB PNG lands at roughly 42KB.

Files go to `public/uploads/` under a random UUID name — the client filename is
never trusted. The route is auth-guarded, validates type and size, and decodes
before writing, so a mislabelled file cannot land in `public/`.

## Book translation

`/admin/books` — upload an Arabic PDF and translate it page by page.

The workspace is side by side: the source page renders on the right (the
reading-start edge in RTL) and the Dhivehi translation on the left, using the
same block editor as articles. Each page tracks its own status, and the page
rail shows at a glance what is done.

**Translation** goes through Gemini. Only the selected page is sent — it is
split out with `pdf-lib` first, which keeps the request small and stops the
model drifting onto neighbouring pages. The response comes back as structured
blocks, so Qur'anic ayat and hadith arrive as `ayah` / `hadith` blocks with the
Arabic preserved verbatim and the Dhivehi in the translation field.

Set the key to enable it:

```bash
# .env.local
GEMINI_API_KEY=your-key-here
GEMINI_MODEL=gemini-2.5-flash   # optional
```

Without a key, uploading and hand-writing translations still work; the
translate button is disabled and the page explains why.

**On the PDF viewer:** pages are rendered with pdf.js to a canvas rather than
shown in an `<iframe>`. The browser's built-in PDF viewer is not guaranteed to
exist — some environments download the file instead of displaying it — and its
chrome cannot be controlled. The worker is copied into `public/` by a
`postinstall` script.

## Data

SQLite via `better-sqlite3`, at `data/fighfoiy.db`. The schema is created and
seeded with categories and sample articles on first run — there is no migration
step to run. The file is gitignored.

Mutations go through server actions in `lib/actions.ts`; reads through
`lib/queries.ts`.

## Running

```bash
npm run dev
```

Then open http://localhost:3000 for the site and http://localhost:3000/admin for the CMS.

```bash
npm run build && npm run start   # production
npm run lint
```

## Layout

```
app/
  (site)/          public site: home, category, article
  admin/           CMS: dashboard, articles, editor, categories, settings
components/
  site/            reader components (header, cards, block renderer)
  admin/           editor, block editor, breadcrumb
  ui/              shadcn primitives
lib/
  db.ts            schema + seed          queries.ts   reads
  actions.ts       server actions         fonts.ts     local font faces
  types.ts         content model          utils-format.ts  Dhivehi dates/slugs
public/fonts/      the four self-hosted faces
```
# fighfoii
