/**
 * Splits pasted source text into pages.
 *
 * Two strategies:
 *  - an explicit separator, when the text already carries page markers;
 *  - otherwise by size, breaking on paragraph boundaries so a page never ends
 *    mid-sentence. A single paragraph longer than the target becomes its own
 *    page rather than being cut.
 */
export function splitIntoPages(
  text: string,
  { charsPerPage = 1800, separator = "" }: { charsPerPage?: number; separator?: string } = {}
): string[] {
  const clean = text.replace(/\r\n?/g, "\n").trim();
  if (!clean) return [];

  if (separator.trim()) {
    return clean
      .split(separator)
      .map((p) => p.trim())
      .filter(Boolean);
  }

  const target = Math.max(200, charsPerPage);
  const paragraphs = clean.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  const pages: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    if (!current) {
      current = para;
    } else if (current.length + para.length + 2 <= target) {
      current += "\n\n" + para;
    } else {
      pages.push(current);
      current = para;
    }
  }
  if (current) pages.push(current);

  return pages;
}

export const DEFAULT_CHARS_PER_PAGE = 1800;
