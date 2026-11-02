import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { generateDiagram } from "@/lib/gemini";
import { countNodes, parseOutline } from "@/lib/diagram";

/** Builds a mind-map outline from a passage. Authoring only. */
export async function POST(req: Request) {
  await requireUser();

  const { source } = (await req.json()) as { source?: string };
  if (!source?.trim()) {
    return NextResponse.json({ error: "ލިޔުމެއް ދެއްވާ" }, { status: 400 });
  }

  try {
    const outline = await generateDiagram(source);
    // A single line is a title, not a map — say so rather than render nothing.
    if (countNodes(parseOutline(outline)) < 2) {
      return NextResponse.json({ error: "ޑަޔަގްރާމެއް އުފެއްދޭ ވަރަށް ނެތް" }, { status: 422 });
    }
    return NextResponse.json({ outline });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "ނުއުފެއްދުނު" },
      { status: 500 }
    );
  }
}
