"use client";

/**
 * Maps between a browser selection and the character offsets stored with a mark.
 *
 * Marks are anchored to a block id plus offsets into that block's text, rather
 * than to a DOM path, so they survive re-rendering and any change to blocks
 * around them. Painting uses the CSS Custom Highlight API: it styles ranges
 * without inserting nodes, so highlights cannot fight React over the DOM.
 */

export interface Segment {
  blockId: number;
  start: number;
  end: number;
  text: string;
}

/** Ordered text nodes inside a container — the coordinate space offsets live in. */
function textNodes(container: Node): Text[] {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const out: Text[] = [];
  let n = walker.nextNode();
  while (n) {
    out.push(n as Text);
    n = walker.nextNode();
  }
  return out;
}

/** Character offset of a (node, offset) boundary within a container. */
function offsetOf(container: Node, node: Node, nodeOffset: number): number | null {
  let total = 0;
  for (const t of textNodes(container)) {
    if (t === node) return total + nodeOffset;
    total += t.data.length;
  }
  // The boundary may sit on an element rather than inside a text node.
  if (node.nodeType === Node.ELEMENT_NODE) {
    const probe = document.createRange();
    probe.selectNodeContents(container);
    probe.setEnd(node, nodeOffset);
    return probe.toString().length;
  }
  return null;
}

/** Rebuilds a DOM range from stored offsets. Returns null if they no longer fit. */
export function rangeFromOffsets(
  container: HTMLElement,
  start: number,
  end: number
): Range | null {
  const nodes = textNodes(container);
  let seen = 0;
  let range: Range | null = null;

  for (const t of nodes) {
    const nodeEnd = seen + t.data.length;

    if (!range && start >= seen && start <= nodeEnd) {
      range = document.createRange();
      range.setStart(t, start - seen);
    }
    if (range && end >= seen && end <= nodeEnd) {
      range.setEnd(t, end - seen);
      return range;
    }
    seen = nodeEnd;
  }
  return null;
}

/**
 * Splits the current selection into one segment per block it touches, so a
 * highlight dragged across a heading and the paragraph under it is stored as
 * two anchored pieces rather than one that belongs to neither.
 */
export function selectionSegments(root: HTMLElement): Segment[] {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return [];

  const selection = sel.getRangeAt(0);
  if (!root.contains(selection.commonAncestorContainer)) return [];

  const segments: Segment[] = [];

  for (const el of root.querySelectorAll<HTMLElement>("[data-block-id]")) {
    const blockRange = document.createRange();
    blockRange.selectNodeContents(el);

    // Skip blocks the selection does not reach.
    if (
      selection.compareBoundaryPoints(Range.END_TO_START, blockRange) >= 0 ||
      selection.compareBoundaryPoints(Range.START_TO_END, blockRange) <= 0
    ) {
      continue;
    }

    const clipped = selection.cloneRange();
    if (clipped.compareBoundaryPoints(Range.START_TO_START, blockRange) < 0) {
      clipped.setStart(blockRange.startContainer, blockRange.startOffset);
    }
    if (clipped.compareBoundaryPoints(Range.END_TO_END, blockRange) > 0) {
      clipped.setEnd(blockRange.endContainer, blockRange.endOffset);
    }

    const text = clipped.toString().trim();
    if (!text) continue;

    const start = offsetOf(el, clipped.startContainer, clipped.startOffset);
    const end = offsetOf(el, clipped.endContainer, clipped.endOffset);
    if (start === null || end === null || end <= start) continue;

    segments.push({
      blockId: Number(el.dataset.blockId),
      start,
      end,
      text: clipped.toString(),
    });
  }

  return segments;
}

export const supportsHighlightApi = () =>
  typeof CSS !== "undefined" && !!CSS.highlights && typeof Highlight !== "undefined";
