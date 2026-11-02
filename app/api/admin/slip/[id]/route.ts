import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { PRIVATE_DIR } from "@/lib/db";
import { getOrder } from "@/lib/store";

/**
 * Shows a payment slip to an editor.
 *
 * Slips are stored outside public/ because they are strangers' bank records;
 * this route is the only way to see one, and it requires a session.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const order = getOrder(Number(id));
  if (!order?.slipPath) return new NextResponse("Not found", { status: 404 });

  const file = path.join(PRIVATE_DIR, "slips", path.basename(order.slipPath));
  if (!fs.existsSync(file)) return new NextResponse("Not found", { status: 404 });

  const ext = path.extname(file).toLowerCase();
  const type =
    ext === ".pdf"
      ? "application/pdf"
      : ext === ".png"
        ? "image/png"
        : ext === ".webp"
          ? "image/webp"
          : "image/jpeg";

  return new NextResponse(fs.readFileSync(file) as unknown as BodyInit, {
    headers: { "content-type": type, "cache-control": "private, no-store" },
  });
}
