import crypto from "node:crypto";
import { getDb } from "./db";
import { slugify } from "./utils-format";

/**
 * The study-material shop.
 *
 * There are no reader accounts, so an order is tied to the email typed at
 * checkout and to a random token. The token is what lets a buyer reach their
 * file without logging in, and it is only issued once an editor has looked at
 * the transfer slip and approved the order.
 */

export interface Product {
  id: number;
  slug: string;
  title: string;
  description: string;
  /** Laari, so money is never held in a float. */
  price: number;
  filePath: string;
  cover: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

type ProductRow = {
  id: number; slug: string; title: string; description: string; price: number;
  file_path: string; cover: string; published: number;
  created_at: string; updated_at: string;
};

const toProduct = (r: ProductRow): Product => ({
  id: r.id,
  slug: r.slug,
  title: r.title,
  description: r.description,
  price: r.price,
  filePath: r.file_path,
  cover: r.cover,
  published: !!r.published,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

/** Rufiyaa, from a laari amount. */
export function formatPrice(laari: number): string {
  return `${(laari / 100).toLocaleString("en", { minimumFractionDigits: 2 })}/- ރ.`;
}

export function listProducts(onlyPublished = false): Product[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM products ${onlyPublished ? "WHERE published = 1" : ""}
        ORDER BY created_at DESC`
    )
    .all() as ProductRow[];
  return rows.map(toProduct);
}

export function getProduct(slug: string): Product | undefined {
  const row = getDb().prepare("SELECT * FROM products WHERE slug = ?").get(slug) as
    | ProductRow
    | undefined;
  return row ? toProduct(row) : undefined;
}

export function getProductById(id: number): Product | undefined {
  const row = getDb().prepare("SELECT * FROM products WHERE id = ?").get(id) as
    | ProductRow
    | undefined;
  return row ? toProduct(row) : undefined;
}

export function createProduct(title: string): number {
  const db = getDb();
  const base = slugify(title) || `product-${Date.now().toString(36)}`;

  let slug = base;
  let n = 2;
  while (db.prepare("SELECT 1 FROM products WHERE slug = ?").get(slug)) {
    slug = `${base}-${n++}`;
  }

  const res = db
    .prepare("INSERT INTO products (slug, title) VALUES (?, ?)")
    .run(slug, title.trim() || "ފޮތެއް");
  return Number(res.lastInsertRowid);
}

/* ── Orders ─────────────────────────────────────────────────────────────── */

export type OrderStatus = "pending" | "approved" | "rejected";

export interface Order {
  id: number;
  productId: number;
  productTitle: string;
  productSlug: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  slipPath: string;
  status: OrderStatus;
  note: string;
  token: string;
  createdAt: string;
  reviewedAt: string | null;
}

type OrderRow = {
  id: number; product_id: number; buyer_name: string; buyer_email: string;
  buyer_phone: string; slip_path: string; status: string; note: string;
  token: string; created_at: string; reviewed_at: string | null;
  product_title: string; product_slug: string;
};

const toOrder = (r: OrderRow): Order => ({
  id: r.id,
  productId: r.product_id,
  productTitle: r.product_title,
  productSlug: r.product_slug,
  buyerName: r.buyer_name,
  buyerEmail: r.buyer_email,
  buyerPhone: r.buyer_phone,
  slipPath: r.slip_path,
  status: r.status as OrderStatus,
  note: r.note,
  token: r.token,
  createdAt: r.created_at,
  reviewedAt: r.reviewed_at,
});

const ORDER_SELECT = `
  SELECT o.*, p.title AS product_title, p.slug AS product_slug
    FROM orders o JOIN products p ON p.id = o.product_id
`;

export function listOrders(status?: string): Order[] {
  const where = status && status !== "all" ? "WHERE o.status = ?" : "";
  const stmt = getDb().prepare(`${ORDER_SELECT} ${where} ORDER BY o.created_at DESC`);
  const rows = (status && status !== "all" ? stmt.all(status) : stmt.all()) as OrderRow[];
  return rows.map(toOrder);
}

export function getOrder(id: number): Order | undefined {
  const row = getDb().prepare(`${ORDER_SELECT} WHERE o.id = ?`).get(id) as
    | OrderRow
    | undefined;
  return row ? toOrder(row) : undefined;
}

/** Looked up by token alone, so the link in a delivery email works unauthenticated. */
export function getOrderByToken(token: string): Order | undefined {
  if (!token || token.length < 20) return undefined;
  const row = getDb().prepare(`${ORDER_SELECT} WHERE o.token = ?`).get(token) as
    | OrderRow
    | undefined;
  return row ? toOrder(row) : undefined;
}

export function createOrder(input: {
  productId: number;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  slipPath: string;
}): number {
  const res = getDb()
    .prepare(
      `INSERT INTO orders (product_id, buyer_name, buyer_email, buyer_phone, slip_path)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(
      input.productId,
      input.buyerName.trim().slice(0, 120),
      input.buyerEmail.trim().slice(0, 160),
      input.buyerPhone.trim().slice(0, 40),
      input.slipPath
    );
  return Number(res.lastInsertRowid);
}

/** Issued on approval only — an unapproved order has no usable token. */
export function issueToken(orderId: number): string {
  const token = crypto.randomBytes(24).toString("base64url");
  getDb().prepare("UPDATE orders SET token = ? WHERE id = ?").run(token, orderId);
  return token;
}

export function isValidEmail(value: string): boolean {
  // Deliberately loose: the delivery attempt is the real test of an address.
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}
