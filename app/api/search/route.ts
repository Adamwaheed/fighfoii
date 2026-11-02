import { NextResponse } from "next/server";
import { search } from "@/lib/search";

/** Only published articles and translated pages are indexed, so this is public. */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  if (q.trim().length < 2) return NextResponse.json({ hits: [] });

  return NextResponse.json({ hits: search(q, 24) });
}
