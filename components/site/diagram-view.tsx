import { layout, parseOutline, type LaidOutNode } from "@/lib/diagram";

/**
 * Renders a mind map as inline SVG.
 *
 * Laid out on the server, so a diagram ships as markup with no client script
 * and no charting library. Depth drives the colour so the hierarchy is legible
 * at a glance; the palette is the site's own.
 */

const DEPTH_STYLE = [
  { fill: "var(--brand-deep)", text: "var(--paper)", stroke: "var(--brand-deep)" },
  { fill: "var(--brand)", text: "var(--paper)", stroke: "var(--brand)" },
  { fill: "var(--paper-2)", text: "var(--heading-ink)", stroke: "var(--rule-strong)" },
  { fill: "var(--paper-4)", text: "var(--article-ink)", stroke: "var(--rule)" },
];

const styleFor = (depth: number) => DEPTH_STYLE[Math.min(depth, DEPTH_STYLE.length - 1)];

/** A curve from the start edge of the parent to the end edge of the child. */
function connector(from: LaidOutNode, to: LaidOutNode): string {
  // RTL: the parent sits to the right, so lines leave its left edge.
  const x1 = from.x;
  const y1 = from.y + from.height / 2;
  const x2 = to.x + to.width;
  const y2 = to.y + to.height / 2;
  const mid = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`;
}

export function DiagramView({
  outline,
  caption,
}: {
  outline: string;
  caption?: string;
}) {
  const tree = parseOutline(outline);
  if (!tree) return null;

  const { nodes, edges, width, height } = layout(tree);
  const PAD = 8;

  return (
    <figure className="my-8">
      {/* Wide maps scroll on their own rather than pushing the article sideways. */}
      <div className="border-rule-soft bg-paper-4 overflow-x-auto rounded-[10px] border p-4">
        <svg
          viewBox={`${-PAD} ${-PAD} ${width + PAD * 2} ${height + PAD * 2}`}
          width={width + PAD * 2}
          height={height + PAD * 2}
          role="img"
          aria-label={caption || tree.label}
          className="mx-auto block h-auto max-w-none"
        >
          <g fill="none" stroke="var(--rule-strong)" strokeWidth={1.5}>
            {edges.map((e, i) => (
              <path key={i} d={connector(e.from, e.to)} />
            ))}
          </g>

          {nodes.map((n, i) => {
            const s = styleFor(n.depth);
            return (
              <g key={i}>
                <rect
                  x={n.x}
                  y={n.y}
                  width={n.width}
                  height={n.height}
                  rx={8}
                  fill={s.fill}
                  stroke={s.stroke}
                  strokeWidth={1}
                />
                <text
                  x={n.x + n.width / 2}
                  y={n.y + n.height / 2}
                  fill={s.text}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  direction="rtl"
                  fontSize={15}
                  className="font-sans"
                >
                  {n.lines.map((line, li) => (
                    <tspan
                      key={li}
                      x={n.x + n.width / 2}
                      // Centre the block of lines on the box.
                      dy={li === 0 ? -((n.lines.length - 1) * 26) / 2 : 26}
                    >
                      {line}
                    </tspan>
                  ))}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {caption && (
        <figcaption className="text-faint-ink mt-2.5 text-center text-[13px] leading-[1.9]">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
