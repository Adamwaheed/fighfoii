"use server";

import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireUser } from "./auth";
import { PRIVATE_DIR, getDb } from "./db";
import { encryptSecret } from "./secrets";
import { deliveryEmail, sendMail } from "./email";
import { SITE_URL } from "./site";
import {
  createOrder,
  createProduct,
  getOrder,
  getProductById,
  isValidEmail,
  issueToken,
} from "./store";

// Both directories sit outside public/: a paid file served statically would be
// free to anyone who guessed its name, and a slip is a stranger's bank record.
const SLIP_DIR = path.join(PRIVATE_DIR, "slips");
const FILES_DIR = path.join(PRIVATE_DIR, "products");

const MAX_SLIP_BYTES = 6 * 1024 * 1024;
const SLIP_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

/* ── Checkout ───────────────────────────────────────────────────────────── */

/**
 * Places an order.
 *
 * Public, so everything is validated here. The slip is the only thing a
 * stranger can put on disk, so its type and size are checked and the name is
 * generated rather than taken from the upload.
 */
export async function placeOrder(fd: FormData) {
  // Honeypot.
  if (String(fd.get("website") ?? "").trim()) return { error: null, ok: true };

  const productId = Number(fd.get("productId"));
  const product = getProductById(productId);
  if (!product || !product.published) return { error: "ފޮތެއް ނުފެނުނު", ok: false };

  const email = String(fd.get("email") ?? "").trim();
  if (!isValidEmail(email)) return { error: "އީމެއިލް ރަނގަޅަށް ލިޔުއްވާ", ok: false };

  const slip = fd.get("slip");
  if (!(slip instanceof File) || slip.size === 0) {
    return { error: "ފައިސާ ދެއްކި ސްލިޕް އަޕްލޯޑްކުރައްވާ", ok: false };
  }
  if (slip.size > MAX_SLIP_BYTES) {
    return { error: "ސްލިޕް ބޮޑުވެއްޖެ (6MB އަށްވުރެ)", ok: false };
  }
  if (!SLIP_TYPES.has(slip.type)) {
    return { error: "ސްލިޕަކީ ފޮޓޯއެއް ނުވަތަ PDF އަކަށް ވާންޖެހޭ", ok: false };
  }

  await fs.mkdir(SLIP_DIR, { recursive: true });

  // The stored name is generated: an attacker-supplied filename must never
  // reach the filesystem, and the extension comes from the checked type.
  const ext =
    slip.type === "application/pdf" ? "pdf" : slip.type === "image/png" ? "png" : slip.type === "image/webp" ? "webp" : "jpg";
  const name = `${crypto.randomUUID()}.${ext}`;
  await fs.writeFile(path.join(SLIP_DIR, name), Buffer.from(await slip.arrayBuffer()));

  createOrder({
    productId: product.id,
    buyerName: String(fd.get("name") ?? ""),
    buyerEmail: email,
    buyerPhone: String(fd.get("phone") ?? ""),
    // Stored as a bare name; it is only ever read back through an authenticated route.
    slipPath: name,
  });

  revalidatePath("/admin/store");
  return { error: null, ok: true };
}

/* ── Editor review ──────────────────────────────────────────────────────── */

/**
 * Approves an order and tries to email the download link.
 *
 * The approval is committed before the send is attempted, and a failed send is
 * reported rather than thrown: the money has been checked either way, and the
 * editor can copy the link by hand from the order.
 */
export async function approveOrder(id: number) {
  await requireUser();

  const order = getOrder(id);
  if (!order) return { error: "އޯޑަރެއް ނުފެނުނު", mail: null };

  const token = order.token || issueToken(id);
  getDb()
    .prepare(
      "UPDATE orders SET status = 'approved', reviewed_at = datetime('now') WHERE id = ?"
    )
    .run(id);

  revalidatePath("/admin/store");

  const downloadUrl = `${SITE_URL}/store/download/${token}`;
  const mail = deliveryEmail({
    buyerName: order.buyerName,
    productTitle: order.productTitle,
    downloadUrl,
  });

  const sent = await sendMail({ to: order.buyerEmail, ...mail });

  return {
    error: null,
    mail: {
      sent: sent.ok,
      reason: sent.ok ? "" : sent.error,
      configured: sent.ok ? true : sent.configured,
      downloadUrl,
    },
  };
}

export async function rejectOrder(id: number, note: string) {
  await requireUser();
  getDb()
    .prepare(
      `UPDATE orders SET status = 'rejected', note = ?, token = '',
              reviewed_at = datetime('now')
        WHERE id = ?`
    )
    .run(note.trim().slice(0, 500), id);
  revalidatePath("/admin/store");
  return { error: null };
}

export async function deleteOrder(id: number) {
  await requireUser();

  const order = getOrder(id);
  getDb().prepare("DELETE FROM orders WHERE id = ?").run(id);

  // Remove the slip too: it is a payment record belonging to a stranger, and
  // there is no reason to keep it once the order is gone.
  if (order?.slipPath) {
    await fs.unlink(path.join(SLIP_DIR, path.basename(order.slipPath))).catch(() => {});
  }

  revalidatePath("/admin/store");
  return { error: null };
}

/** Re-sends the delivery mail for an already approved order. */
export async function resendDelivery(id: number) {
  await requireUser();

  const order = getOrder(id);
  if (!order || order.status !== "approved") {
    return { error: "އޯޑަރު އެޕްރޫވްކުރައްވާފައި ނެތެވެ", sent: false };
  }

  const token = order.token || issueToken(id);
  const mail = deliveryEmail({
    buyerName: order.buyerName,
    productTitle: order.productTitle,
    downloadUrl: `${SITE_URL}/store/download/${token}`,
  });

  const sent = await sendMail({ to: order.buyerEmail, ...mail });
  return { error: sent.ok ? null : sent.error, sent: sent.ok };
}

/* ── Products ───────────────────────────────────────────────────────────── */

export async function addProduct(title: string) {
  await requireUser();
  const id = createProduct(title);
  revalidatePath("/admin/store");
  return { error: null, id };
}

export async function saveProduct(fd: FormData) {
  await requireUser();

  const id = Number(fd.get("id"));
  const rufiyaa = Number(fd.get("price"));
  // Stored in laari, so no float ever holds money.
  const laari = Number.isFinite(rufiyaa) ? Math.round(rufiyaa * 100) : 0;

  getDb()
    .prepare(
      `UPDATE products
          SET title = ?, description = ?, price = ?, cover = ?, published = ?,
              updated_at = datetime('now')
        WHERE id = ?`
    )
    .run(
      String(fd.get("title") ?? "").trim() || "ފޮތެއް",
      String(fd.get("description") ?? "").trim(),
      Math.max(0, laari),
      String(fd.get("cover") ?? "").trim(),
      fd.get("published") === "on" ? 1 : 0,
      id
    );

  revalidatePath("/admin/store");
  revalidatePath("/store");
  return { error: null };
}

/** Uploads the file a buyer receives. Never served directly from /uploads. */
export async function uploadProductFile(fd: FormData) {
  await requireUser();

  const id = Number(fd.get("id"));
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "ފައިލެއް ހޮއްވަވާ" };
  }
  if (file.size > 60 * 1024 * 1024) return { error: "ފައިލް ބޮޑުވެއްޖެ (60MB)" };

  await fs.mkdir(FILES_DIR, { recursive: true });
  const name = `${crypto.randomUUID()}.pdf`;
  await fs.writeFile(path.join(FILES_DIR, name), Buffer.from(await file.arrayBuffer()));

  getDb()
    .prepare("UPDATE products SET file_path = ?, updated_at = datetime('now') WHERE id = ?")
    .run(name, id);

  revalidatePath("/admin/store");
  return { error: null };
}

export async function deleteProduct(id: number) {
  await requireUser();
  getDb().prepare("DELETE FROM products WHERE id = ?").run(id);
  revalidatePath("/admin/store");
  revalidatePath("/store");
  return { error: null };
}

/* ── Mail credentials ───────────────────────────────────────────────────── */

export async function saveMailKey(fd: FormData) {
  const me = await requireUser();
  if (me.role !== "admin") return { error: "ހުއްދައެއް ނެތް" };

  const key = String(fd.get("key") ?? "").trim();
  const from = String(fd.get("from") ?? "").trim();

  const db = getDb();
  const put = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");

  // An empty key clears it; anything else is stored encrypted at rest.
  if (key) put.run("resend_api_key", encryptSecret(key));
  else db.prepare("DELETE FROM settings WHERE key = 'resend_api_key'").run();

  if (from) put.run("mail_from", from);

  revalidatePath("/admin/settings");
  return { error: null };
}
