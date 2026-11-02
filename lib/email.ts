import { getDb } from "./db";
import { decryptSecret } from "./secrets";

/**
 * Transactional email.
 *
 * The API key is stored encrypted in settings, the same way the Gemini key is,
 * and is never returned to the browser. Sending is best-effort by design: an
 * order must not fail because a mail provider is down, so callers get a result
 * they can record rather than an exception, and the admin panel always offers a
 * manual copy of whatever would have been sent.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export type MailResult =
  | { ok: true; id: string }
  | { ok: false; error: string; configured: boolean };

function setting(key: string): string {
  const row = getDb().prepare("SELECT value FROM settings WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? "";
}

export function getMailKey(): string {
  const fromEnv = process.env.RESEND_API_KEY?.trim();
  if (fromEnv) return fromEnv;

  const stored = setting("resend_api_key");
  return stored ? decryptSecret(stored) : "";
}

export function mailKeySource(): "env" | "admin" | "none" {
  if (process.env.RESEND_API_KEY?.trim()) return "env";
  return setting("resend_api_key") ? "admin" : "none";
}

export function hasMailKey(): boolean {
  return !!getMailKey();
}

/** The From address. Must be on a domain verified with the provider. */
export function getMailFrom(): string {
  return (
    process.env.MAIL_FROM?.trim() ||
    setting("mail_from") ||
    "ފިޤުހު ފޮއި <noreply@fiqhfoiy.com>"
  );
}

export async function sendMail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<MailResult> {
  const key = getMailKey();
  if (!key) {
    return {
      ok: false,
      configured: false,
      error: "އީމެއިލް ފޮނުވުމުގެ ކީ ސެޓުކުރައްވާފައި ނެތެވެ",
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        from: getMailFrom(),
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      // The status is surfaced; the key itself is never echoed back.
      return { ok: false, configured: true, error: `${res.status}: ${detail.slice(0, 200)}` };
    }

    const data = (await res.json()) as { id?: string };
    return { ok: true, id: data.id ?? "" };
  } catch (err) {
    const message =
      err instanceof Error && err.name === "AbortError"
        ? "އީމެއިލް ފޮނުވުން ދިގުލައިގެންފި"
        : err instanceof Error
          ? err.message
          : "އީމެއިލް ނުފޮނުވުނު";
    return { ok: false, configured: true, error: message };
  } finally {
    clearTimeout(timer);
  }
}

/** Delivery note for an approved order. */
export function deliveryEmail(input: {
  buyerName: string;
  productTitle: string;
  downloadUrl: string;
}): { subject: string; html: string; text: string } {
  const greeting = input.buyerName.trim() || "އަޚާ";
  const subject = `${input.productTitle} — ޑައުންލޯޑް ލިންކު`;

  const text = [
    `${greeting},`,
    ``,
    `ފައިސާ ލިބިއްޖެ. ތިރީގައިވާ ލިންކުން ފޮތް ޑައުންލޯޑްކުރެއްވޭނެއެވެ:`,
    input.downloadUrl,
    ``,
    `ފިޤުހު ފޮއި`,
  ].join("\n");

  // Inline styles and a table-free layout: mail clients strip stylesheets, and
  // the message has to read right-to-left wherever it lands.
  const html = `<div dir="rtl" style="font-family:system-ui,-apple-system,sans-serif;line-height:2;color:#0B1A3D">
  <p>${escapeHtml(greeting)}،</p>
  <p>ފައިސާ ލިބިއްޖެ. ތިރީގައިވާ ލިންކުން ފޮތް ޑައުންލޯޑްކުރެއްވޭނެއެވެ.</p>
  <p><a href="${escapeHtml(input.downloadUrl)}" style="display:inline-block;background:#1B62C4;color:#fff;padding:12px 22px;border-radius:4px;text-decoration:none">${escapeHtml(input.productTitle)}</a></p>
  <p style="font-size:13px;color:#46587D">ލިންކު މަސައްކަތްނުކުރާނަމަ:<br><span dir="ltr">${escapeHtml(input.downloadUrl)}</span></p>
  <p style="font-size:13px;color:#46587D">ފިޤުހު ފޮއި</p>
</div>`;

  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
