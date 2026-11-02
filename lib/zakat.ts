import { parseJson, requestGemini } from "./gemini";

/**
 * Reading balances out of an uploaded bank statement.
 *
 * Two things shape this module.
 *
 * First, privacy. A bank statement is among the most sensitive documents a
 * person owns, and reading it means sending it to Google's API. So the file is
 * never written to disk, never logged, and never kept after the response: it
 * exists only in memory for the length of one request. The page that calls this
 * says so plainly and offers manual entry instead.
 *
 * Second, zakat is not simply "balance × 2.5%". It falls on wealth held for a
 * full lunar year, so a closing balance is a starting point the reader must
 * adjust, not an answer. Nothing here decides a ruling.
 *
 * A lowest-balance figure would suit the held-for-a-year rule better, and was
 * tried. It is not offered, because the model could not produce one reliably:
 * against a 26-page statement it returned a value drawn from page 1, later
 * pages contradicted it, and when the prompt demanded every page be read it
 * claimed all 26 while still citing page 1. A wrong figure here becomes a wrong
 * zakat payment, so the reader is asked for that number instead.
 */

export interface StatementReading {
  /** Balance at the end of the statement period. */
  closingBalance: number | null;
  currency: string;
  periodFrom: string;
  periodTo: string;
  /** What the model could not determine, in its own words. */
  notes: string;
}

const PROMPT = `You are reading a bank statement to help someone calculate zakat.

Extract ONLY these figures and return them as JSON:
{
  "closingBalance": number or null,   // closing/available balance at the end of the period
  "currency": string,                 // e.g. "MVR", "USD"
  "periodFrom": string,               // YYYY-MM-DD, "" if unclear
  "periodTo": string,                 // YYYY-MM-DD, "" if unclear
  "notes": string                     // anything unclear, in one short sentence
}

Rules:
- Report numbers as plain numbers: no currency symbols, no thousands separators.
- If a figure is not clearly present, use null. Do NOT estimate, infer, or guess.
- Read the closing balance from the statement's final page or summary section.
- Do NOT include account numbers, names, addresses, or any transaction details.
- Return ONLY the JSON object.`;

const ALLOWED = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

export function isSupportedStatement(mime: string): boolean {
  return ALLOWED.has(mime);
}

/**
 * Sends the statement to Gemini and returns the figures it could read.
 *
 * The buffer is not retained: it is base64-encoded into the request and then
 * goes out of scope with this call.
 */
export async function readStatement(
  file: Buffer,
  mimeType: string
): Promise<StatementReading> {
  const text = await requestGemini(
    [
      { inline_data: { mime_type: mimeType, data: file.toString("base64") } },
      { text: PROMPT },
    ],
    // Extraction, not reasoning: a thinking budget here buys nothing and the
    // response is a handful of fields.
    { maxOutputTokens: 2048, thinkingBudget: 0 }
  );

  const raw = parseJson<Partial<StatementReading>>(text);

  const num = (v: unknown): number | null => {
    const n = typeof v === "string" ? Number(v.replace(/[^\d.-]/g, "")) : v;
    return typeof n === "number" && Number.isFinite(n) && n >= 0 ? n : null;
  };

  const str = (v: unknown, max: number): string =>
    typeof v === "string" ? v.trim().slice(0, max) : "";

  return {
    closingBalance: num(raw.closingBalance),
    currency: str(raw.currency, 8).toUpperCase(),
    periodFrom: str(raw.periodFrom, 10),
    periodTo: str(raw.periodTo, 10),
    notes: str(raw.notes, 300),
  };
}

/** Zakat is 2.5% — one fortieth — of zakatable wealth. */
export const ZAKAT_RATE = 0.025;

export function zakatOn(amount: number): number {
  return amount * ZAKAT_RATE;
}
