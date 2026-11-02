import type { BlockType } from "./types";

export interface HeadingLike {
  type: BlockType;
  level: number;
}

export const MAX_HEADING_LEVEL = 4;

export function clampLevel(level: number): number {
  return Math.min(Math.max(Math.round(level) || 1, 1), MAX_HEADING_LEVEL);
}

/**
 * Hierarchical numbers for the heading blocks in an article — 1, 1.1, 1.2, 2 …
 *
 * A heading is numbered only when it has at least one sibling at the same depth
 * under the same parent. A section that is the only one of its level reads
 * better unnumbered, so numbering switches itself on exactly when a real
 * sequence exists.
 *
 * Returns one entry per input block, aligned by index: the number string for a
 * numbered heading, or null for everything else.
 */
export function computeHeadingNumbers(blocks: HeadingLike[]): (string | null)[] {
  const counters = Array(MAX_HEADING_LEVEL).fill(0);
  const numbers: (string | null)[] = blocks.map(() => null);
  const groups: (string | null)[] = blocks.map(() => null);
  const groupSize = new Map<string, number>();

  blocks.forEach((b, i) => {
    if (b.type !== "heading") return;

    const level = clampLevel(b.level);
    counters[level - 1] += 1;
    // Entering a new section restarts everything nested beneath it.
    for (let deeper = level; deeper < MAX_HEADING_LEVEL; deeper++) counters[deeper] = 0;

    const trail = counters.slice(0, level);
    numbers[i] = trail.join(".");

    // Siblings share a depth *and* a parent; the parent trail identifies them.
    const group = `${level}:${trail.slice(0, level - 1).join(".")}`;
    groups[i] = group;
    groupSize.set(group, (groupSize.get(group) ?? 0) + 1);
  });

  return numbers.map((n, i) => {
    const group = groups[i];
    if (!n || !group) return null;
    return (groupSize.get(group) ?? 0) >= 2 ? n : null;
  });
}

/**
 * Font size, colour and indent for each heading depth.
 *
 * Depth 1 matches the reference reading layout exactly (37px/66.6px, black,
 * 30.71px vertical margin); deeper levels step down from it on the same 1.8
 * leading ratio, with indent carrying the hierarchy.
 */
export const HEADING_STYLES: Record<
  number,
  { text: string; color: string; indent: string; margin: string }
> = {
  1: {
    text: "text-[37px] leading-[66.6px]",
    color: "text-article-heading",
    indent: "",
    margin: "my-[30.71px]",
  },
  2: {
    text: "text-[30px] leading-[54px]",
    color: "text-article-heading",
    indent: "ps-[0.75rem]",
    margin: "mt-[28px] mb-[14px]",
  },
  3: {
    text: "text-[25px] leading-[45px]",
    color: "text-article-heading",
    indent: "ps-[1.5rem]",
    margin: "mt-[24px] mb-[12px]",
  },
  4: {
    text: "text-[21px] leading-[37.8px]",
    color: "text-article-heading",
    indent: "ps-[2.25rem]",
    margin: "mt-[20px] mb-[10px]",
  },
};
