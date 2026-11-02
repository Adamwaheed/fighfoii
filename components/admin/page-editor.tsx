"use client";

import { useState } from "react";

import { Editable } from "./editable";
import { Thumb } from "@/components/site/thumb";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { BLOCK_LABELS, BLOCK_ORDER, type BlockType } from "@/lib/types";
import { HEADING_STYLES, clampLevel, computeHeadingNumbers } from "@/lib/headings";
import { blockStyleCss, isPlain, parseBlockStyle } from "@/lib/block-style";
import { BlockStyleControls } from "./block-style-controls";
import { ImageUploader } from "./image-uploader";
import { emptyBlock, type DraftBlock } from "./block-editor";
import { DiagramField } from "./diagram-field";
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, XIcon } from "lucide-react";

/**
 * Writes the article inside its published layout: every text run is a
 * contentEditable region carrying the exact reader typography, so what is being
 * typed is what ships. Structural edits use the hover rail on each block.
 */
export function PageEditor({
  blocks,
  onChange,
  meta,
  onMeta,
}: {
  blocks: DraftBlock[];
  onChange: (next: DraftBlock[]) => void;
  /**
   * Article header fields. Omitted for a book page, which has no title or
   * byline of its own — only body blocks.
   */
  meta?: { title: string; kicker: string; author: string };
  onMeta?: (patch: Partial<{ title: string; kicker: string; author: string }>) => void;
}) {
  const update = (i: number, patch: Partial<DraftBlock>) =>
    onChange(blocks.map((b, j) => (j === i ? { ...b, ...patch } : b)));

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  const remove = (i: number) => onChange(blocks.filter((_, j) => j !== i));

  const insertAt = (index: number, type: BlockType) => {
    const next = [...blocks];
    next.splice(index, 0, emptyBlock(type));
    onChange(next);
  };

  const noteIndex = (i: number) =>
    blocks.slice(0, i + 1).filter((b) => b.type === "note").length;

  // Same numbering the reader computes, so page mode shows exactly what ships.
  const headingNumbers = computeHeadingNumbers(blocks);

  return (
    <article className="prose-thaana mx-auto w-full max-w-[660px]">
      {meta && onMeta && (
        <>
        <Editable
          value={meta.kicker}
          onChange={(v) => onMeta({ kicker: v })}
          placeholder="ބައި…"
          ariaLabel="ކިކަރ"
          className="text-brand-accent mb-2.5 text-[13px]"
        />

        <Editable
          as="h1"
          value={meta.title}
          onChange={(v) => onMeta({ title: v })}
          placeholder="ލިޔުމުގެ ސުރުޚީ…"
          ariaLabel="ސުރުޚީ"
          className="font-heading text-article-heading mt-10 mb-[33.5px] text-[50px] leading-[75px] text-pretty"
        />

        <div className="border-rule text-muted-ink mb-[30px] flex flex-wrap items-center gap-[11px] border-b pb-4 text-[13.5px] leading-[1.9]">
          <Editable
            as="span"
            value={meta.author}
            onChange={(v) => onMeta({ author: v })}
            placeholder="ލިޔުންތެރިޔާ…"
            ariaLabel="ލިޔުންތެރިޔާ"
          />
        </div>
        </>
      )}

      {blocks.length > 0 && (
        <div className="group/blk relative h-0">
          <AddBlockButton onAdd={(type) => insertAt(0, type)} position="top" />
        </div>
      )}

      {blocks.map((b, i) => (
        <div key={b.key} className="group/blk relative">
          {/* Structural controls sit outside the measure, on the end edge. */}
          <div className="absolute top-1 -end-11 z-10 hidden flex-col gap-0.5 group-hover/blk:flex group-focus-within/blk:flex">
            <Rail label="މައްޗަށް" onClick={() => move(i, -1)} disabled={i === 0}>
              <ArrowUpIcon className="size-3.5" />
            </Rail>
            <Rail
              label="ތިރިއަށް"
              onClick={() => move(i, 1)}
              disabled={i === blocks.length - 1}
            >
              <ArrowDownIcon className="size-3.5" />
            </Rail>
            <Rail label="ފޮހެލާ" onClick={() => remove(i)} destructive>
              <XIcon className="size-4" />
            </Rail>
            {/* Change what a block is without losing what it says. */}
            <select
              value={b.type}
              onChange={(e) => update(i, { type: e.target.value as BlockType })}
              aria-label="ބްލޮކްގެ ބާވަތް"
              title={BLOCK_LABELS[b.type]}
              className="border-rule bg-card text-muted-ink hover:text-brand size-7 cursor-pointer rounded-sm border text-[10px]"
            >
              {BLOCK_ORDER.map((t) => (
                <option key={t} value={t}>
                  {BLOCK_LABELS[t]}
                </option>
              ))}
            </select>
            <div className="[&_button]:size-7 [&_button]:border-rule [&_button]:bg-card [&_button]:border">
              <BlockStyleControls
                value={b.style}
                onChange={(style) => update(i, { style })}
              />
            </div>
          </div>

          <StyledBlock style={b.style}>
            <BlockFields
              block={b}
              noteNo={noteIndex(i)}
              headingNo={headingNumbers[i]}
              onPatch={(patch) => update(i, patch)}
            />
          </StyledBlock>

          <AddBlockButton onAdd={(type) => insertAt(i + 1, type)} />
        </div>
      ))}

      {blocks.length === 0 && (
        <div className="relative py-6">
          <AddBlockButton onAdd={(type) => onChange([emptyBlock(type)])} alwaysVisible />
        </div>
      )}
    </article>
  );
}

/** Mirrors BlockShell so page mode shows the surface while it is edited. */
function StyledBlock({ style: raw, children }: { style: string; children: React.ReactNode }) {
  const style = parseBlockStyle(raw);
  if (isPlain(style)) return <>{children}</>;
  return (
    <div className="my-5" style={blockStyleCss(style)}>
      {children}
    </div>
  );
}

function Rail({
  children,
  label,
  onClick,
  disabled,
  destructive,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`border-rule bg-card grid size-7 place-items-center rounded-sm border transition-colors disabled:opacity-25 ${
        destructive
          ? "text-faint-ink hover:border-[#C68B7B] hover:text-[#A8402A]"
          : "text-muted-ink hover:border-brand hover:text-brand"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Floating insert control.
 *
 * The container is absolutely positioned and zero-height, and the palette lives
 * in a portalled popover — so revealing it on hover cannot reflow the article.
 * An in-flow strip pushed every block below it down as the mouse moved.
 */
function AddBlockButton({
  onAdd,
  alwaysVisible = false,
  position = "bottom",
}: {
  onAdd: (type: BlockType) => void;
  alwaysVisible?: boolean;
  position?: "top" | "bottom";
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 z-20 flex justify-center ${
        position === "top" ? "-top-3" : "-bottom-3"
      }`}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="ބްލޮކް އިތުރުކުރައްވާ"
            title="ބްލޮކް އިތުރުކުރައްވާ"
            className={`border-rule bg-card text-muted-ink hover:border-brand hover:text-brand pointer-events-auto grid size-6 place-items-center rounded-full border shadow-sm transition-opacity ${
              alwaysVisible || open
                ? "opacity-100"
                : "opacity-0 group-hover/blk:opacity-100 group-focus-within/blk:opacity-100"
            }`}
          >
            <PlusIcon className="size-3.5" />
          </button>
        </PopoverTrigger>

        <PopoverContent align="center" side="bottom" className="w-[260px] p-2">
          <div className="text-muted-ink px-1 pb-2 text-[12.5px]">
            ބްލޮކް އިތުރުކުރައްވާ
          </div>
          <div className="grid grid-cols-2 gap-1">
            {BLOCK_ORDER.map((type) => (
              <Button
                key={type}
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  onAdd(type);
                  setOpen(false);
                }}
                className="text-muted-ink hover:text-brand h-8 justify-start px-2 text-[13px]"
              >
                {BLOCK_LABELS[type]}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function BlockFields({
  block: b,
  noteNo,
  headingNo,
  onPatch,
}: {
  block: DraftBlock;
  noteNo: number;
  headingNo?: string | null;
  onPatch: (patch: Partial<DraftBlock>) => void;
}) {
  switch (b.type) {
    case "heading": {
      const level = clampLevel(b.level);
      const style = HEADING_STYLES[level];
      const Tag = (["h2", "h3", "h4", "h5"] as const)[level - 1];
      return (
        <div className={`${style.margin} ${style.indent}`}>
          <Editable
            key={`${b.key}-sub`}
            value={b.sub}
            onChange={(v) => onPatch({ sub: v })}
            placeholder="ކުޑަ ސުރުޚީ…"
            className="text-brand-accent mb-1.5 text-[12.5px] leading-[1.8] tracking-[0.04em]"
          />
          <div className="flex items-baseline gap-2.5">
            {headingNo && (
              <span className="font-arabic text-brand-accent flex-none tabular-nums">{headingNo}</span>
            )}
            <Editable
              as={Tag === "h2" ? "h2" : Tag === "h3" ? "h3" : "div"}
              value={b.main}
              onChange={(v) => onPatch({ main: v })}
              placeholder="ސުރުޚީ…"
              className={`font-heading ${style.color} ${style.text} m-0 flex-1 text-pretty`}
            />
          </div>
          <div className="mt-1 flex gap-1">
            {[1, 2, 3, 4].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => onPatch({ level: lvl })}
                aria-label={`H${lvl}`}
                className={`font-arabic h-5 w-5 rounded-sm text-[10px] transition-colors ${
                  level === lvl
                    ? "bg-brand text-paper"
                    : "text-faint-ink hover:text-brand opacity-0 group-hover/blk:opacity-100"
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>
      );
    }

    case "ayah":
      return b.level === 1 ? (
        <figure
          className="my-8 rounded-[8px] border px-6 pt-[26px] pb-5"
          style={{ borderColor: "var(--ayah-border)", background: "var(--ayah-bg)" }}
        >
          <Editable
            value={b.main}
            onChange={(v) => onPatch({ main: v })}
            placeholder="آية…"
            className="font-quran text-center text-[29px] leading-[2.35] text-pretty"
            style={{ color: "var(--ayah-text)" }}
          thaana={false}
          />
          <div className="mt-5 mb-4 h-px" style={{ background: "var(--ayah-rule)" }} />
          <Editable
            value={b.sub}
            onChange={(v) => onPatch({ sub: v })}
            placeholder="ދިވެހި ތަރުޖަމާ…"
            className="text-center text-[17px] leading-[2.2] text-pretty"
            style={{ color: "var(--ayah-translation)" }}
          />
          <Editable
            value={b.ref}
            onChange={(v) => onPatch({ ref: v })}
            placeholder="البقرة ١٨٣"
            className="font-arabic text-brand-accent mt-3.5 text-center text-[13px] leading-[1.8]"
          thaana={false}
          />
        </figure>
      ) : (
        <figure className="border-brand-accent my-8 border-s-[3px] ps-[22px]">
          <Editable
            value={b.main}
            onChange={(v) => onPatch({ main: v })}
            placeholder="آية…"
            className="font-quran text-brand-deep text-[28px] leading-[2.35] text-pretty"
          thaana={false}
          />
          <Editable
            value={b.sub}
            onChange={(v) => onPatch({ sub: v })}
            placeholder="ދިވެހި ތަރުޖަމާ…"
            className="mt-3.5 text-[17px] leading-[2.2] text-pretty"
            style={{ color: "var(--ayah-translation)" }}
          />
          <Editable
            value={b.ref}
            onChange={(v) => onPatch({ ref: v })}
            placeholder="البقرة ١٨٣"
            className="font-arabic text-brand-accent mt-2.5 text-[13px] leading-[1.8]"
          thaana={false}
          />
        </figure>
      );

    case "hadith":
      return (
        <figure
          className="my-8 rounded-[8px] border px-[22px] pt-[22px] pb-[18px]"
          style={{ borderColor: "var(--hadith-border)", background: "var(--hadith-bg)" }}
        >
          <div className="mb-3.5 text-[12px] tracking-[0.06em]" style={{ color: "var(--hadith-ref)" }}>
            ޙަދީޘް
          </div>
          <Editable
            value={b.main}
            onChange={(v) => onPatch({ main: v })}
            placeholder="الحديث…"
            className="font-arabic text-center text-[26px] leading-[2.1] text-pretty"
            style={{ color: "var(--hadith-text)" }}
          thaana={false}
          />
          <Editable
            value={b.sub}
            onChange={(v) => onPatch({ sub: v })}
            placeholder="ދިވެހި ތަރުޖަމާ…"
            className="mt-4 text-center text-[16.5px] leading-[2.2] text-pretty"
            style={{ color: "var(--hadith-translation)" }}
          />
          <Editable
            value={b.ref}
            onChange={(v) => onPatch({ ref: v })}
            placeholder="ބުޚާރީ 1، މުސްލިމް 1907"
            className="text-muted-ink mt-3 text-center text-[13px] leading-[1.8]"
          />
        </figure>
      );

    case "subheading": {
      const size = [22, 19.2, 17][Math.min(Math.max(b.level, 1), 3) - 1];
      return (
        <div className="mt-7 mb-3">
          <Editable
            key={`${b.key}-label`}
            value={b.sub}
            onChange={(v) => onPatch({ sub: v })}
            placeholder="ކުޑަ ލޭބަލް…"
            className="text-brand-accent mb-1 text-[12.5px]"
          />
          <Editable
            value={b.main}
            onChange={(v) => onPatch({ main: v })}
            placeholder="ދަށު ސުރުޚީ…"
            className="text-article-heading font-semibold text-pretty"
            style={{ fontSize: `${size}px`, lineHeight: 1.8 }}
          />
        </div>
      );
    }

    case "quote":
      return (
        <figure className="border-brand-accent my-8 border-s-[3px] ps-[22px]">
          <Editable
            value={b.main}
            onChange={(v) => onPatch({ main: v })}
            placeholder="ނަޤުލުކުރައްވާ ބަސްފުޅު…"
            className="text-ink-soft text-[18px] leading-[2.2] text-pretty"
          />
          <figcaption className="text-muted-ink mt-3 flex flex-wrap gap-2 text-[13.5px] leading-[1.9]">
            <Editable
              as="span"
              value={b.sub}
              onChange={(v) => onPatch({ sub: v })}
              placeholder="ބުނުއްވި ފަރާތް…"
            />
            <Editable
              as="span"
              value={b.ref}
              onChange={(v) => onPatch({ ref: v })}
              placeholder="މަޞްދަރު…"
              className="text-brand-accent"
            thaana={false}
          />
          </figcaption>
        </figure>
      );

    case "qna":
      return (
        <div className="border-rule my-8 border-t pt-5">
          <div className="mb-3 flex items-start gap-3">
            <span className="bg-brand text-paper grid size-6 flex-none place-items-center rounded-full text-[13px] leading-none">
              س
            </span>
            <Editable
              value={b.main}
              onChange={(v) => onPatch({ main: v })}
              placeholder="ސުވާލު…"
              className="font-heading text-heading-ink flex-1 text-[20px] leading-[1.7] text-pretty"
            />
          </div>
          <div className="flex items-start gap-3">
            <span className="bg-brand-accent text-paper grid size-6 flex-none place-items-center rounded-full text-[13px] leading-none">
              ج
            </span>
            <Editable
              value={b.sub}
              onChange={(v) => onPatch({ sub: v })}
              placeholder="ޖަވާބު…"
              className="text-ink-soft flex-1 text-[17px] leading-[2.2] text-pretty"
            />
          </div>
        </div>
      );

    case "callout":
      return (
        <aside className="border-brand-accent bg-paper-2 my-7 border-s-[3px] px-5 py-4">
          <Editable
            value={b.ref}
            onChange={(v) => onPatch({ ref: v })}
            placeholder="ސަމާލުކަމަށް…"
            className="text-brand-accent mb-2 text-[12.5px] tracking-[0.06em]"
          />
          <Editable
            value={b.main}
            onChange={(v) => onPatch({ main: v })}
            placeholder="މުހިންމު ނުކުތާ…"
            className="text-ink-soft text-[16.5px] leading-[2.1] text-pretty"
          />
        </aside>
      );

    case "reference": {
      const sources = b.main.split("\n");
      const setSource = (idx: number, text: string) => {
        const next = [...sources];
        next[idx] = text;
        onPatch({ main: next.join("\n") });
      };
      return (
        <section className="border-rule mt-10 border-t pt-5">
          <Editable
            value={b.ref}
            onChange={(v) => onPatch({ ref: v })}
            placeholder="މަޞްދަރުތައް"
            className="font-heading text-heading-ink mb-3 text-[19px] leading-[1.6]"
          />
          <ol className="grid gap-2">
            {sources.map((src, idx) => (
              <li key={`${b.key}-src-${idx}`} className="flex items-start gap-3">
                <span className="font-arabic text-brand-accent mt-0.5 flex-none text-[13px] tabular-nums">
                  {idx + 1}.
                </span>
                <Editable
                  value={src}
                  onChange={(v) => setSource(idx, v)}
                  placeholder="މަޞްދަރު…"
                  className="text-muted-ink flex-1 text-[14.5px] leading-[2] text-pretty"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const next = [...sources];
                      next.splice(idx + 1, 0, "");
                      onPatch({ main: next.join("\n") });
                    } else if (
                      e.key === "Backspace" &&
                      sources.length > 1 &&
                      (e.currentTarget.textContent ?? "") === ""
                    ) {
                      e.preventDefault();
                      onPatch({ main: sources.filter((_, j) => j !== idx).join("\n") });
                    }
                  }}
                thaana={false}
          />
              </li>
            ))}
          </ol>
        </section>
      );
    }

    case "image":
      return (
        <figure className="my-8">
          {b.image ? (
            <Thumb src={b.image} alt={b.main} sizes="740px" className="h-[290px] w-full" />
          ) : null}
          <div className="mt-2">
            <ImageUploader value={b.image} onChange={(url) => onPatch({ image: url })} />
          </div>
          <Editable
            value={b.main}
            onChange={(v) => onPatch({ main: v })}
            placeholder="ފޮޓޯގެ ތަޢާރަފު…"
            className="text-muted-ink mt-2.5 text-center text-[13.5px] leading-[1.9] text-pretty"
          />
        </figure>
      );

    case "list": {
      const items = b.main.split("\n");
      const setItem = (idx: number, text: string) => {
        const next = [...items];
        next[idx] = text;
        onPatch({ main: next.join("\n") });
      };
      return (
        <ul className="my-[22px] mb-[26px] grid gap-3">
          {items.map((it, idx) => (
            <li key={`${b.key}-${idx}`} className="flex items-start gap-3">
              <span className="bg-brand-accent mt-[15px] size-[7px] flex-none rounded-full" />
              <Editable
                value={it}
                onChange={(v) => setItem(idx, v)}
                placeholder="ނުކުތާ…"
                className="text-article-ink flex-1 text-[19.2px] leading-[34.56px] text-pretty"
                onKeyDown={(e) => {
                  // Enter splits into a new bullet; Backspace on an empty one removes it.
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const next = [...items];
                    next.splice(idx + 1, 0, "");
                    onPatch({ main: next.join("\n") });
                  } else if (
                    e.key === "Backspace" &&
                    items.length > 1 &&
                    (e.currentTarget.textContent ?? "") === ""
                  ) {
                    e.preventDefault();
                    onPatch({ main: items.filter((_, j) => j !== idx).join("\n") });
                  }
                }}
              />
            </li>
          ))}
        </ul>
      );
    }

    case "note":
      return (
        <div className="bg-paper-2 my-[22px] flex items-start gap-3 border-s-2 border-[#A9C4DF] px-4 py-[13px]">
          <span className="font-arabic text-brand-accent flex-none text-[14px] leading-[2.1]">
            {noteNo}
          </span>
          <Editable
            value={b.main}
            onChange={(v) => onPatch({ main: v })}
            placeholder="ފާހަގަ…"
            className="flex-1 text-[15px] leading-[2.1] text-[#3C5077] text-pretty"
          />
        </div>
      );

    case "diagram":
      // The map is structured text, so it gets the same editor here as in block
      // mode rather than a contentEditable that would mangle the indentation.
      return (
        <DiagramField
          outline={b.main}
          caption={b.sub}
          onOutlineChange={(v) => onPatch({ main: v })}
          onCaptionChange={(v) => onPatch({ sub: v })}
        />
      );

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
        <Editable
          as="p"
          value={b.main}
          onChange={(v) => onPatch({ main: v })}
          placeholder="ފޮޅުވަތް ލިޔުއްވާ…"
          className="text-article-ink my-[19.2px] text-justify text-[19.2px] leading-[34.56px] text-pretty"
        />
      );
  }
}
