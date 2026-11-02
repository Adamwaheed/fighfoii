import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { structureText } from "@/lib/gemini";

/** Turns a pasted passage into article blocks. Authoring only. */
export async function POST(req: Request) {
  await requireUser();

  const { source } = (await req.json()) as { source?: string };
  if (!source?.trim()) {
    return NextResponse.json({ error: "ލިޔުމެއް ދެއްވާ" }, { status: 400 });
  }

  try {
    const blocks = await structureText(source);
    if (!blocks.length) {
      return NextResponse.json({ error: "ބްލޮކެއް ނުއުފެއްދުނު" }, { status: 422 });
    }
    return NextResponse.json({ blocks });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "ނުއުފެއްދުނު" },
      { status: 500 }
    );
  }
}
