import type { Block } from "@/lib/types";
import { HEADING_STYLES, clampLevel, computeHeadingNumbers } from "@/lib/headings";
import { Thumb } from "./thumb";
import { DiagramView } from "./diagram-view";
import { BlockShell } from "./block-shell";
import { PdfEmbed } from "./pdf-embed";

/**
 * Renders one content block in reader typography.
 * Mirrors the block styles from the Fiqhu Foi template exactly.
 */
export function BlockView({
  block,
  noteNo,
  headingNo,
}: {
  block: Block;
  noteNo?: number;
  headingNo?: string | null;
}) {
  const b = block;

  switch (b.type) {
    case "heading": {
      const level = clampLevel(b.level);
      const style = HEADING_STYLES[level];
      // Depth 1 is an <h2>: the article title already owns the <h1>.
      const Tag = (["h2", "h3", "h4", "h5"] as const)[level - 1];
      return (
        <div className={`${style.margin} ${style.indent}`}>
          {b.sub && (
            <div className="text-brand-accent mb-1.5 text-[12.5px] leading-[1.8] tracking-[0.04em]">
              {b.sub}
            </div>
          )}
          <Tag className={`font-heading ${style.color} ${style.text} m-0 text-pretty`}>
            {headingNo && (
              <span className="font-arabic text-brand-accent me-2.5 tabular-nums">{headingNo}</span>
            )}
            {b.main}
          </Tag>
        </div>
      );
    }

    case "ayah":
      // level 1 = framed panel, level 0 = plain rule on the leading edge.
      return b.level === 1 ? (
        <figure
          className="my-8 overflow-hidden rounded-[8px] border"
          style={{ borderColor: "var(--ayah-border)", background: "var(--ayah-bg)" }}
        >
          <div
            className="font-quran px-6 pt-[26px] pb-5 text-center text-[29px] leading-[2.35] text-pretty"
            style={{ color: "var(--ayah-text)" }}
          >
            {b.main}
          </div>
          {/* The translation sits on a lighter tone of the same green, so the
              two halves separate without introducing a second colour. */}
          <div
            className="border-t px-6 pt-5 pb-5 text-center text-[17px] leading-[2.2] text-pretty"
            style={{
              borderColor: "var(--ayah-rule)",
              background: "var(--ayah-bg-soft)",
              color: "var(--ayah-translation)",
            }}
          >
            {b.sub}
            {b.ref && (
              <figcaption
                className="font-arabic mt-3.5 text-[13px] leading-[1.8]"
                style={{ color: "var(--ayah-ref)" }}
              >
                {b.ref}
              </figcaption>
            )}
          </div>
        </figure>
      ) : (
        <figure
          className="my-8 border-s-[3px] ps-[22px]"
          style={{ borderColor: "var(--ayah-ref)" }}
        >
          <div
            className="font-quran text-[28px] leading-[2.35] text-pretty"
            style={{ color: "var(--ayah-text)" }}
          >
            {b.main}
          </div>
          <div
            className="mt-3.5 text-[17px] leading-[2.2] text-pretty"
            style={{ color: "var(--ayah-translation)" }}
          >
            {b.sub}
          </div>
          {b.ref && (
            <figcaption
              className="font-arabic mt-2.5 text-[13px] leading-[1.8]"
              style={{ color: "var(--ayah-ref)" }}
            >
              {b.ref}
            </figcaption>
          )}
        </figure>
      );

    case "hadith":
      return (
        <figure
          className="my-8 overflow-hidden rounded-[8px] border"
          style={{ borderColor: "var(--hadith-border)", background: "var(--hadith-bg)" }}
        >
          <div className="px-[22px] pt-[22px] pb-5">
            <div
              className="mb-3.5 text-[12px] tracking-[0.06em]"
              style={{ color: "var(--hadith-ref)" }}
            >
              ޙަދީޘް
            </div>
            <div
              className="font-arabic text-center text-[26px] leading-[2.1] text-pretty"
              style={{ color: "var(--hadith-text)" }}
            >
              {b.main}
            </div>
          </div>
          <div
            className="border-t px-[22px] pt-4 pb-[18px] text-center text-[16.5px] leading-[2.2] text-pretty"
            style={{
              borderColor: "var(--hadith-rule)",
              background: "var(--hadith-bg-soft)",
              color: "var(--hadith-translation)",
            }}
          >
            {b.sub}
            {b.ref && (
              <figcaption
                className="mt-3 text-[13px] leading-[1.8]"
                style={{ color: "var(--hadith-ref)" }}
              >
                މަޞްދަރު: {b.ref}
              </figcaption>
            )}
          </div>
        </figure>
      );

    case "subheading": {
      const size = [22, 19.2, 17][Math.min(Math.max(b.level, 1), 3) - 1];
      return (
        <div
          className="text-article-heading mt-7 mb-3 font-semibold text-pretty"
          style={{ fontSize: `${size}px`, lineHeight: 1.8 }}
        >
          {b.sub && (
            <span className="text-brand-accent me-2 text-[12.5px] font-normal">{b.sub}</span>
          )}
          {b.main}
        </div>
      );
    }

    case "quote":
      return (
        <figure className="border-brand-accent my-8 border-s-[3px] ps-[22px]">
          <div className="text-ink-soft text-[18px] leading-[2.2] text-pretty">{b.main}</div>
          {(b.sub || b.ref) && (
            <figcaption className="text-muted-ink mt-3 text-[13.5px] leading-[1.9]">
              {b.sub}
              {b.sub && b.ref && <span className="text-[#A9C4DF]"> — </span>}
              {b.ref && <span className="text-brand-accent">{b.ref}</span>}
            </figcaption>
          )}
        </figure>
      );

    case "qna":
      return (
        <div className="border-rule my-8 border-t pt-5">
          <div className="mb-3 flex items-start gap-3">
            <span className="bg-brand text-paper grid size-6 flex-none place-items-center rounded-full text-[13px] leading-none">
              س
            </span>
            <div className="font-heading text-heading-ink text-[20px] leading-[1.7] text-pretty">
              {b.main}
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="bg-brand-accent text-paper grid size-6 flex-none place-items-center rounded-full text-[13px] leading-none">
              ج
            </span>
            <div className="text-ink-soft text-[17px] leading-[2.2] text-pretty">{b.sub}</div>
          </div>
        </div>
      );

    case "callout":
      return (
        <aside className="border-brand-accent bg-paper-2 my-7 border-s-[3px] px-5 py-4">
          {b.ref && (
            <div className="text-brand-accent mb-2 text-[12.5px] tracking-[0.06em]">{b.ref}</div>
          )}
          <div className="text-ink-soft text-[16.5px] leading-[2.1] text-pretty">{b.main}</div>
        </aside>
      );

    case "reference": {
      const sources = b.main.split("\n").map((v) => v.trim()).filter(Boolean);
      return (
        <section className="border-rule mt-10 border-t pt-5">
          <div className="font-heading text-heading-ink mb-3 text-[19px] leading-[1.6]">
            {b.ref || "މަޞްދަރުތައް"}
          </div>
          <ol className="grid gap-2">
            {sources.map((src, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="font-arabic text-brand-accent mt-0.5 flex-none text-[13px] tabular-nums">
                  {i + 1}.
                </span>
                <span className="text-muted-ink text-[14.5px] leading-[2] text-pretty">
                  {src}
                </span>
              </li>
            ))}
          </ol>
        </section>
      );
    }

    case "image":
      return (
        <figure className="my-8">
          <Thumb src={b.image} alt={b.main} sizes="740px" className="h-[290px] w-full" />
          {b.main && (
            <figcaption className="text-muted-ink mt-2.5 text-center text-[13.5px] leading-[1.9] text-pretty">
              {b.main}
            </figcaption>
          )}
        </figure>
      );

    case "list": {
      const items = b.main.split("\n").map((s) => s.trim()).filter(Boolean);
      return (
        <ul className="my-[22px] mb-[26px] grid gap-3">
          {items.map((it, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="bg-brand-accent mt-[15px] size-[7px] flex-none rounded-full" />
              <span className="text-article-ink text-[19.2px] leading-[34.56px] text-pretty">{it}</span>
            </li>
          ))}
        </ul>
      );
    }

    case "note":
      return (
        <div className="bg-paper-2 my-[22px] flex items-start gap-3 border-s-2 border-[#A9C4DF] px-4 py-[13px]">
          <span className="font-arabic text-brand-accent flex-none text-[14px] leading-[2.1]">
            {noteNo ?? 1}
          </span>
          <span className="text-[15px] leading-[2.1] text-[#3C5077] text-pretty">{b.main}</span>
        </div>
      );

    case "diagram":
      // main holds the indented outline; sub is an optional caption.
      return <DiagramView outline={b.main} caption={b.sub} />;

    case "pdf":
      // `main` holds the file URL, `sub` the caption, `ref` the label.
      return b.main ? (
        <figure className="my-8">
          <div className="border-rule-soft overflow-hidden rounded-[8px] border">
            <PdfEmbed url={b.main} />
            <div className="border-rule-soft bg-paper-4 flex flex-wrap items-center justify-between gap-2 border-t px-3.5 py-2.5">
              <span className="text-muted-ink min-w-0 truncate text-[13px] leading-[1.8]">
                {b.ref || "PDF"}
              </span>
              <a
                href={b.main}
                download
                className="border-rule text-brand-deep hover:border-rule-strong hover:bg-paper-2 inline-flex min-h-9 flex-none items-center gap-1.5 rounded-[4px] border px-3 text-[13px] leading-[1.7] transition-colors"
              >
                ޑައުންލޯޑް
              </a>
            </div>
          </div>
          {b.sub && (
            <figcaption className="text-faint-ink mt-2 text-center text-[12.5px] leading-[1.8]">
              {b.sub}
            </figcaption>
          )}
        </figure>
      ) : null;

    case "divider":
      return (
        <div className="my-[38px] flex items-center justify-center gap-2.5 text-[#9FD8F5]">
          <span className="h-px w-[70px] bg-[#C7DCF0]" />
          <span className="font-arabic text-[18px]">۞</span>
          <span className="h-px w-[70px] bg-[#C7DCF0]" />
        </div>
      );

    case "text":
    default:
      return (
        <p className="text-article-ink my-[19.2px] text-justify text-[19.2px] leading-[34.56px] text-pretty">
          {b.main}
        </p>
      );
  }
}

/** Renders an ordered block list, numbering footnotes and headings as it goes. */
export function BlockList({ blocks }: { blocks: Block[] }) {
  // Both numberings are derived from position, not counters mutated mid-render.
  const noteIds = blocks.filter((b) => b.type === "note").map((b) => b.id);
  const headingNumbers = computeHeadingNumbers(blocks);

  return (
    <>
      {blocks.map((b, i) => (
        <BlockShell key={b.id} style={b.style}>
          <BlockView
            block={b}
            noteNo={b.type === "note" ? noteIds.indexOf(b.id) + 1 : undefined}
            headingNo={headingNumbers[i]}
          />
        </BlockShell>
      ))}
    </>
  );
}
