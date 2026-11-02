import { NextResponse } from "next/server";
import { recordLike, recordView } from "@/lib/engagement";

/**
 * Counter endpoint.
 *
 * Called from the browser rather than counted during the server render: a
 * render happens for prefetches and crawlers too, and counting those would
 * make the number meaningless. The browser also decides how often to send,
 * which is what keeps a reload from inflating the count.
 */
export async function POST(req: Request) {
  let payload: { slug?: string; action?: string; delta?: number };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const slug = String(payload.slug ?? "").trim();
  if (!slug) return NextResponse.json({ error: "bad request" }, { status: 400 });

  if (payload.action === "view") {
    const counts = recordView(slug);
    return counts
      ? NextResponse.json(counts)
      : NextResponse.json({ error: "not found" }, { status: 404 });
  }

  if (payload.action === "like") {
    const delta = payload.delta === -1 ? -1 : 1;
    const counts = recordLike(slug, delta);
    return counts
      ? NextResponse.json(counts)
      : NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({ error: "bad request" }, { status: 400 });
}
