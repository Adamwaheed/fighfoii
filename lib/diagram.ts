/**
 * Mind maps, stored as an indented outline.
 *
 * The tree lives in the block's own text — one node per line, indentation for
 * depth — rather than as JSON in a side field. That keeps it editable by hand,
 * diffable, and searchable: the labels are real words, so a diagram's contents
 * turn up in site search like any other text.
 *
 * Layout runs on the server and the result is plain SVG, so a diagram costs no
 * client JavaScript at all.
 */

export interface DiagramNode {
  label: string;
  children: DiagramNode[];
}

/** One node per line; two spaces (or a tab) per level. Blank lines are ignored. */
export function parseOutline(text: string): DiagramNode | null {
  const lines = text
    .split("\n")
    .map((l) => l.replace(/\t/g, "  ").replace(/\s+$/, ""))
    .filter((l) => l.trim().length > 0);

  if (!lines.length) return null;

  // Depths are ranked rather than divided: an outline indented by 4, or by a
  // ragged mix, still yields the levels the author clearly meant.
  const indents = lines.map((l) => l.length - l.trimStart().length);
  const ladder = [...new Set(indents)].sort((a, b) => a - b);
  const depthOf = (indent: number) => ladder.indexOf(indent);

  const root: DiagramNode = { label: lines[0].trim().replace(/^[-*•]\s*/, ""), children: [] };
  // stack[d] is the most recent node at depth d.
  const stack: DiagramNode[] = [root];

  for (let i = 1; i < lines.length; i++) {
    const depth = Math.min(depthOf(indents[i]), stack.length);
    const node: DiagramNode = {
      label: lines[i].trim().replace(/^[-*•]\s*/, ""),
      children: [],
    };
    const parent = stack[Math.max(depth - 1, 0)];
    parent.children.push(node);
    stack[depth] = node;
    stack.length = depth + 1;
  }

  return root;
}

export function serializeOutline(node: DiagramNode, depth = 0): string {
  const line = `${"  ".repeat(depth)}${node.label}`;
  return [line, ...node.children.map((c) => serializeOutline(c, depth + 1))].join("\n");
}

/** Nodes in the tree, for a quick size check before rendering. */
export function countNodes(node: DiagramNode | null): number {
  if (!node) return 0;
  return 1 + node.children.reduce((n, c) => n + countNodes(c), 0);
}

// --- layout -----------------------------------------------------------------

/**
 * Advance width of one *base* character at 15px, measured against the rendered
 * face. Thaana fili and Arabic harakat are combining marks that take no width
 * of their own, so they are excluded from the count — charging for them made
 * every box roughly twice as wide as its text.
 */
const CHAR_WIDTH = 8.7;

/** Combining marks: Thaana fili (U+07A6–U+07B0) and Arabic harakat. */
const COMBINING = /[\u07A6-\u07B0\u064B-\u0652\u0670]/g;

/** Characters that actually advance the pen. */
function visualLength(s: string): number {
  return s.replace(COMBINING, "").length;
}
const LINE_HEIGHT = 26;
const PAD_X = 14;
const PAD_Y = 10;
const MAX_CHARS = 16;
const GAP_Y = 14;
const GAP_X = 54;

export interface LaidOutNode {
  label: string;
  lines: string[];
  depth: number;
  /** Top-left in an RTL frame: x grows leftward from the root. */
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DiagramLayout {
  nodes: LaidOutNode[];
  edges: { from: LaidOutNode; to: LaidOutNode }[];
  width: number;
  height: number;
}

/** Greedy wrap on whole words, falling back to a hard split for a long one. */
function wrap(label: string): string[] {
  const words = label.split(/\s+/).filter(Boolean);
  if (!words.length) return [""];

  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const candidate = line ? `${line} ${w}` : w;
    if (visualLength(candidate) <= MAX_CHARS) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    if (visualLength(w) <= MAX_CHARS) {
      line = w;
    } else {
      for (let i = 0; i < w.length; i += MAX_CHARS) lines.push(w.slice(i, i + MAX_CHARS));
      line = "";
    }
  }
  if (line) lines.push(line);
  return lines;
}

interface Placed extends LaidOutNode {
  children: Placed[];
}

/**
 * Tidy horizontal tree: depth sets the column, leaves take successive rows, and
 * every parent centres on its children.
 */
export function layout(root: DiagramNode): DiagramLayout {
  const columnWidth: number[] = [];

  // Measure first — a column is as wide as its widest label. The tree shape is
  // carried through the recursion rather than looked up afterwards, so repeated
  // labels cannot be confused for one another.
  const build = (node: DiagramNode, depth: number): Placed => {
    const lines = wrap(node.label);
    const width =
      Math.max(...lines.map((l) => visualLength(l))) * CHAR_WIDTH + PAD_X * 2;
    const height = lines.length * LINE_HEIGHT + PAD_Y * 2;
    columnWidth[depth] = Math.max(columnWidth[depth] ?? 0, width);

    return {
      label: node.label,
      lines,
      depth,
      x: 0,
      y: 0,
      width,
      height,
      children: node.children.map((c) => build(c, depth + 1)),
    };
  };

  const tree = build(root, 0);

  // Column positions, measured left to right and flipped at the end.
  const columnX: number[] = [];
  let cursor = 0;
  columnWidth.forEach((w, d) => {
    columnX[d] = cursor;
    cursor += w + GAP_X;
  });
  const totalWidth = Math.max(cursor - GAP_X, 0);

  let nextY = 0;
  const place = (n: Placed) => {
    n.x = columnX[n.depth];

    if (!n.children.length) {
      n.y = nextY;
      nextY += n.height + GAP_Y;
      return;
    }

    n.children.forEach(place);
    const first = n.children[0];
    const last = n.children[n.children.length - 1];
    n.y = (first.y + last.y + last.height - n.height) / 2;
  };
  place(tree);

  // Collect, flipping x so the root sits on the right — this is an RTL site.
  const nodes: LaidOutNode[] = [];
  const edges: { from: LaidOutNode; to: LaidOutNode }[] = [];
  // Rounded because the flip is a subtraction of accumulated floats, which can
  // land a hair below zero and put a box fractionally outside the frame.
  const round = (v: number) => Math.round(v * 100) / 100;

  const collect = (n: Placed) => {
    n.x = round(totalWidth - n.x - n.width);
    n.y = round(n.y);
    nodes.push(n);
    for (const c of n.children) {
      collect(c);
      edges.push({ from: n, to: c });
    }
  };
  collect(tree);

  // A parent centred above its children can sit above the frame; shift back in.
  const minY = Math.min(...nodes.map((n) => n.y));
  if (minY < 0) for (const n of nodes) n.y -= minY;

  return {
    nodes,
    edges,
    width: totalWidth,
    height: Math.max(...nodes.map((n) => n.y + n.height), 0),
  };
}
