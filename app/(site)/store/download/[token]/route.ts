import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { PRIVATE_DIR } from "@/lib/db";
import { getOrderByToken, getProductById } from "@/lib/store";

/**
 * Serves a purchased file.
 *
 * The token is the whole authorisation: it is issued only when an editor
 * approves the order, cleared if the order is later rejected, and long enough
 * that guessing one is not a practical attack. The file itself lives outside
 * public/, so this route is the only way to reach it.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const order = getOrderByToken(token);

  if (!order || order.status !== "approved") {
    return new NextResponse("ނުފެނުނު", { status: 404 });
  }

  const stored = getProductById(order.productId)?.filePath;
  if (!stored) return new NextResponse("ނުފެނުނު", { status: 404 });

  // basename defends the join even though the value is generated, not supplied.
  const file = path.join(PRIVATE_DIR, "products", path.basename(stored));
  if (!fs.existsSync(file)) return new NextResponse("ނުފެނުނު", { status: 404 });

  const stat = fs.statSync(file);
  const name = `${order.productSlug || "book"}.pdf`;

  return new NextResponse(fs.createReadStream(file) as unknown as BodyInit, {
    headers: {
      "content-type": "application/pdf",
      "content-length": String(stat.size),
      "content-disposition": `attachment; filename="${encodeURIComponent(name)}"`,
      // A paid file must never be held by a shared cache.
      "cache-control": "private, no-store",
    },
  });
}
