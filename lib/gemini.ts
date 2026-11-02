import "server-only";
import { getDb } from "./db";
import { decryptSecret } from "./secrets";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

export const DEFAULT_MODEL = "gemini-2.5-flash";

function readSetting(key: string): string {
  const row = getDb().prepare("SELECT value FROM settings WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? "";
}

/**
 * The API key, from the environment first so a deployment can pin it, then
 * from the admin panel (stored encrypted).
 */
export function getGeminiKey(): string {
  const fromEnv = process.env.GEMINI_API_KEY?.trim();
  if (fromEnv) return fromEnv;
  return decryptSecret(readSetting("gemini_api_key"));
}

/** Where the active key came from, for showing the admin what is in force. */
export function geminiKeySource(): "env" | "admin" | "none" {
  if (process.env.GEMINI_API_KEY?.trim()) return "env";
  return decryptSecret(readSetting("gemini_api_key")) ? "admin" : "none";
}

export function getGeminiModel(): string {
  return (
    process.env.GEMINI_MODEL?.trim() || readSetting("gemini_model") || DEFAULT_MODEL
  );
}

export function hasGeminiKey(): boolean {
  return Boolean(getGeminiKey());
}

/** Cheap credential check: lists models without spending tokens. */
export async function verifyGeminiKey(
  key: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${ENDPOINT}?pageSize=1`, {
      headers: { "x-goog-api-key": key },
    });
    if (res.ok) return { ok: true };
    const body = await res.text().catch(() => "");
    return { ok: false, error: `${res.status}: ${body.slice(0, 200)}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "network error" };
  }
}

export interface TranslatedBlock {
  type:
    | "text"
    | "heading"
    | "subheading"
    | "ayah"
    | "hadith"
    | "quote"
    | "qna"
    | "list"
    | "callout"
    | "note"
    | "reference";
  main: string;
  sub?: string;
  ref?: string;
  level?: number;
}

export interface PageTranslation {
  /** The Arabic as it appears on the page. */
  arabic: string;
  /** Dhivehi rendering, already split into editor blocks. */
  blocks: TranslatedBlock[];
}

const PROMPT = `You are given a single page from an Arabic book as a PDF.

Do two things:

1. Transcribe the Arabic text of the page exactly as printed, in reading order.
   Put this in "arabic". Preserve diacritics where present. Do not summarise,
   do not add commentary, and do not omit anything.

2. Translate that page into Dhivehi (Thaana script), and express the translation
   as an ordered list of blocks in "blocks":

   - "text"    prose paragraph. "main" = Dhivehi.
   - "heading" a section title. "main" = Dhivehi. "level" 1-4 by depth.
   - "ayah"    a Qur'anic verse. "main" = the Arabic verse verbatim,
               "sub" = Dhivehi translation, "ref" = surah and ayah number.
   - "hadith"  a hadith. "main" = Arabic matn verbatim, "sub" = Dhivehi
               translation, "ref" = the source if the page states one.
   - "quote"   a quoted scholar. "main" = Dhivehi, "sub" = who said it,
               "ref" = the cited work if given.
   - "list"    bullet points. "main" = one point per line, separated by \\n.
   - "note"    a footnote or marginal note. "main" = Dhivehi.

Return ONLY a JSON object of exactly this shape, with no markdown fence:
{"arabic": "...", "blocks": [{"type": "text|heading|ayah|hadith|quote|list|note",
"main": "...", "sub": "...", "ref": "...", "level": 1}]}

Rules:
- Emit each block once. Never repeat a block you have already emitted.
- "sub", "ref" and "level" may be omitted when they do not apply.
- Qur'anic and hadith Arabic must stay in Arabic in "main"; never transliterate it.
- Keep the page's own order and structure.
- If the page is blank or has no readable text, return an empty "blocks" array
  and an empty "arabic" string.
- Return only the Dhivehi translation for prose; do not include the Arabic
  alongside it except in the ayah, hadith and quote blocks described above.`;

const TEXT_PROMPT = `You are given a page of Arabic text from a book.

1. Return the source text unchanged in "arabic".

2. Translate it into Dhivehi (Thaana script) as an ordered list of blocks in
   "blocks", using the same block kinds and rules as below.`
  + PROMPT.slice(PROMPT.indexOf("   - \"text\""));

/**
 * Sends one page (as a single-page PDF) to Gemini and returns the transcribed
 * Arabic plus a Dhivehi translation already shaped into editor blocks.
 */
export async function translatePage(pdfPage: Buffer): Promise<PageTranslation> {
  return callGemini([
    {
      inline_data: {
        mime_type: "application/pdf",
        data: pdfPage.toString("base64"),
      },
    },
    { text: PROMPT },
  ]);
}

const EXTRACT_PROMPT = `You are given a single page from an Arabic book as a PDF.

Transcribe the Arabic text of the page exactly as printed, in reading order.
Preserve diacritics where they appear. Do not translate, summarise, comment, or
omit anything, and do not add headings or numbering that are not on the page.

Return the transcribed text and nothing else. If the page has no readable text,
return an empty response.`;

/**
 * Transcription only — no translation.
 *
 * Cheaper and faster than translatePage: plain-text output rather than a JSON
 * document, so the model spends its budget on the page instead of structure.
 */
export async function extractPage(pdfPage: Buffer): Promise<string> {
  const key = getGeminiKey();
  if (!key) throw new Error("Gemini API key ސެޓުކުރައްވާފައި ނެތެވެ");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  let res: Response;
  try {
    res = await fetch(`${ENDPOINT}/${getGeminiModel()}:generateContent`, {
      signal: controller.signal,
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                inline_data: {
                  mime_type: "application/pdf",
                  data: pdfPage.toString("base64"),
                },
              },
              { text: EXTRACT_PROMPT },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 8192,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("ލިޔުން ނެގުން ދިގުލައިގެންފި — އަލުން މަސައްކަތްކުރައްވާ");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status}: ${detail.slice(0, 300)}`);
  }

  const data = await res.json();
  const candidate = data?.candidates?.[0];
  const reason: string | undefined = candidate?.finishReason;

  const text: string = (candidate?.content?.parts ?? [])
    .map((p: { text?: string }) => p?.text ?? "")
    .join("");

  if (reason === "MAX_TOKENS") {
    throw new Error("ޞަފުޙާ ދިގުވުމުން ލިޔުން ފުރިހަމައެއް ނުވި");
  }
  if (!text.trim() && (reason === "SAFETY" || data?.promptFeedback?.blockReason)) {
    throw new Error("Gemini މި ޞަފުޙާ ބްލޮކްކުރިއެވެ");
  }

  return text.trim();
}

/** Same contract, but for a page of already-extracted source text. */
export async function translateText(source: string): Promise<PageTranslation> {
  if (!source.trim()) return { arabic: "", blocks: [] };
  return callGemini([
    { text: `${TEXT_PROMPT}\n\n--- SOURCE TEXT ---\n${source}` },
  ]);
}

export type Part = { text: string } | { inline_data: { mime_type: string; data: string } };

/**
 * One request to Gemini, returning the raw response text.
 *
 * Shared by page translation and the shorter title calls so the timeout,
 * error surfacing and finish-reason handling stay in one place.
 */
export async function requestGemini(
  parts: Part[],
  {
    maxOutputTokens = 16384,
    thinkingBudget = 512,
    // The translation calls want JSON back; the outline call wants plain text,
    // and asking for JSON there would wrap the outline in a quoted string.
    responseMimeType = "application/json",
  } = {}
): Promise<string> {
  const key = getGeminiKey();
  if (!key) {
    throw new Error("Gemini API key ސެޓުކުރައްވާފައި ނެތެވެ");
  }

  // A hung request should fail cleanly rather than spin until the route dies.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  let res: Response;
  try {
    res = await fetch(`${ENDPOINT}/${getGeminiModel()}:generateContent`, {
      signal: controller.signal,
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 0.2,
          // No responseSchema here on purpose. Constraining this prompt with one
          // made the model loop until it exhausted the output budget — 148s and
          // MAX_TOKENS every time, versus ~17s and a clean stop without it.
          maxOutputTokens,
          // Thinking counts against maxOutputTokens. Left unbounded it ate
          // 6,065 tokens on a 651-token page and truncated a translation that
          // itself needed only ~2,100 — the page was never the problem. A small
          // budget keeps the block structure that disabling it entirely loses.
          thinkingConfig: { thinkingBudget },
          responseMimeType,
        },
      }),
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("ތަރުޖަމާ ދިގުލައިގެންފި — އަލުން މަސައްކަތްކުރައްވާ");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    // Surface the status; the key itself is never echoed back.
    throw new Error(`Gemini ${res.status}: ${detail.slice(0, 300)}`);
  }

  const data = await res.json();
  const candidate = data?.candidates?.[0];
  const reason: string | undefined = candidate?.finishReason;

  // Concatenate every part: long pages can come back split across several.
  const text: string = (candidate?.content?.parts ?? [])
    .map((p: { text?: string }) => p?.text ?? "")
    .join("");

  if (!text.trim()) {
    if (reason === "SAFETY" || data?.promptFeedback?.blockReason) {
      throw new Error("Gemini މި ޞަފުޙާ ބްލޮކްކުރިއެވެ");
    }
    throw new Error(`Gemini އިން ޖަވާބެއް ނުލިބުނު (${reason ?? "unknown"})`);
  }

  if (reason === "MAX_TOKENS") {
    throw new Error(
      "ޖަވާބު ފުރިހަމައެއް ނުވި — ޞަފުޙާ ބައިކޮށްލައްވާ ނުވަތަ އަލުން މަސައްކަތްކުރައްވާ"
    );
  }

  return text;
}

/** Tolerates a stray markdown fence even though the prompts forbid one. */
export function parseJson<T>(text: string): T {
  try {
    const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error("Gemini އިން ލިބުނު ޖަވާބު ކިޔޭ ގޮތަކަށް ނެތް");
  }
}

async function callGemini(parts: Part[]): Promise<PageTranslation> {
  const parsed = parseJson<PageTranslation>(await requestGemini(parts));

  return {
    arabic: typeof parsed.arabic === "string" ? parsed.arabic : "",
    blocks: Array.isArray(parsed.blocks) ? parsed.blocks.flatMap(normalizeBlock) : [],
  };
}

const BLOCK_TYPES = new Set<TranslatedBlock["type"]>([
  "text",
  "heading",
  "subheading",
  "ayah",
  "hadith",
  "quote",
  "qna",
  "list",
  "callout",
  "note",
  "reference",
]);

/** Coerces one model-supplied block into the shape the editor expects. */
function normalizeBlock(raw: unknown): TranslatedBlock[] {
  if (!raw || typeof raw !== "object") return [];
  const b = raw as Record<string, unknown>;
  const main = typeof b.main === "string" ? b.main : "";
  if (!main.trim()) return [];

  const type = BLOCK_TYPES.has(b.type as TranslatedBlock["type"])
    ? (b.type as TranslatedBlock["type"])
    : "text";

  return [
    {
      type,
      main,
      sub: typeof b.sub === "string" ? b.sub : "",
      ref: typeof b.ref === "string" ? b.ref : "",
      level: Number.isFinite(b.level) ? Number(b.level) : 1,
    },
  ];
}

const TITLE_PROMPT = `You translate Arabic chapter titles from an Islamic book into Dhivehi (Thaana script).

Rules:
- Translate the MEANING into natural, readable Dhivehi. Do not transliterate.
- Keep proper nouns and technical Islamic terms in the form Dhivehi readers use.
- Keep each title short, as a heading. No numbering, no explanation, no quotes.
- Return ONLY a JSON array of strings, the same length and order as the input.

Example input: ["باب الطهارة","فصل في الوضوء"]
Example output: ["ޠަހާރަތުގެ ބާބު","ވުޟޫގެ ފަޞްލު"]`;

/**
 * Translates chapter titles in one request.
 *
 * Batched deliberately: a book can carry a hundred chapters, and one call per
 * title would be both slow and far more likely to hit a rate limit. Titles are
 * short, so the whole set fits comfortably in one response.
 */
export async function translateTitles(titles: string[]): Promise<string[]> {
  if (!titles.length) return [];

  const text = await requestGemini(
    [{ text: `${TITLE_PROMPT}\n\n--- TITLES ---\n${JSON.stringify(titles)}` }],
    // Headings need no deliberation, and thinking counts against the budget.
    { maxOutputTokens: 8192, thinkingBudget: 0 }
  );

  const parsed = parseJson<unknown>(text);
  if (!Array.isArray(parsed)) {
    throw new Error("Gemini އިން ލިބުނު ޖަވާބު ކިޔޭ ގޮތަކަށް ނެތް");
  }

  // Pad or trim so the result always lines up with the input by index; a short
  // response must not shift every later title onto the wrong chapter.
  return titles.map((_, i) => {
    const v = parsed[i];
    return typeof v === "string" ? v.trim() : "";
  });
}

const DIAGRAM_PROMPT = `You turn a passage into a mind map outline in Dhivehi (Thaana script).

Rules:
- One concept per line. Indent with exactly two spaces per level.
- The first line is the root: the central concept, 1-4 words.
- Up to 3 levels deep and at most 7 children under any one node.
- Labels are short — a few words, not sentences. No numbering, no punctuation at the end.
- Write every label in Dhivehi. Keep Islamic terms in the form Dhivehi readers use.
- Return ONLY the outline as plain text. No JSON, no code fences, no commentary.

Example output:
ތައުޙީދު
  ރުބޫބިއްޔާ
    ޚަލްޤުކުރެއްވުން
    ރިޒުޤު ދެއްވުން
  އުލޫހިއްޔާ
    ޢިބާދާތް`;

/**
 * Builds a mind-map outline from a passage.
 *
 * Returns the indented text the diagram block stores directly — no JSON step,
 * because the storage format is the outline itself.
 */
export async function generateDiagram(source: string): Promise<string> {
  if (!source.trim()) return "";

  const text = await requestGemini(
    [{ text: `${DIAGRAM_PROMPT}\n\n--- PASSAGE ---\n${source.slice(0, 12000)}` }],
    { maxOutputTokens: 2048, thinkingBudget: 512, responseMimeType: "text/plain" }
  );

  // The prompt forbids a fence, but a stray one must not end up as a node.
  return text
    .replace(/^```(?:\w+)?\s*/i, "")
    .replace(/```\s*$/, "")
    .replace(/\r/g, "")
    .trimEnd();
}

const STRUCTURE_PROMPT = `You take a passage of Dhivehi (Thaana) prose and lay it out as article blocks.

Return JSON: {"blocks":[{"type":"...","main":"...","sub":"...","ref":"...","level":1}]}

Block types and when to use them:
- "heading"    a section title. level 1-4 for depth. main = the title.
- "subheading" a smaller title under a heading.
- "text"       ordinary prose. One block per paragraph.
- "ayah"       a Qur'anic verse. main = the Arabic, sub = the Dhivehi meaning, ref = surah and verse.
- "hadith"     a hadith. main = the Arabic, sub = the Dhivehi meaning, ref = the source.
- "quote"      a quotation that is neither Qur'an nor hadith. ref = who said it.
- "list"       a list. main = the items, one per line.
- "qna"        a question and answer. main = the question, sub = the answer.
- "callout"    something the author is emphasising.
- "note"       an aside or a clarification.
- "reference"  a list of sources at the end. main = one per line.

Rules:
- PRESERVE THE AUTHOR'S WORDS EXACTLY. Do not rewrite, summarise, translate or correct.
- Split prose at real paragraph boundaries. Do not merge separate paragraphs.
- Only use "ayah" or "hadith" when Arabic scripture is actually present.
- If a line is clearly a heading (short, no full stop, introduces what follows) make it one.
- Leave sub and ref as "" when they do not apply.
- Return ONLY the JSON object.`;

export interface StructuredBlock {
  type: TranslatedBlock["type"];
  main: string;
  sub: string;
  ref: string;
  level: number;
}

/**
 * Lays a pasted passage out as blocks.
 *
 * The prompt is emphatic about preserving wording because the model's instinct
 * is to tidy prose it is asked to restructure — and this is the author's own
 * writing, not a draft for it to improve.
 */
export async function structureText(source: string): Promise<StructuredBlock[]> {
  if (!source.trim()) return [];

  const text = await requestGemini(
    [{ text: `${STRUCTURE_PROMPT}\n\n--- TEXT ---\n${source.slice(0, 20000)}` }],
    { maxOutputTokens: 16384, thinkingBudget: 512 }
  );

  const parsed = parseJson<{ blocks?: unknown }>(text);
  if (!Array.isArray(parsed.blocks)) return [];

  return parsed.blocks.flatMap(normalizeBlock).map((b) => ({
    type: b.type,
    main: b.main,
    sub: b.sub ?? "",
    ref: b.ref ?? "",
    level: b.level ?? 1,
  }));
}
