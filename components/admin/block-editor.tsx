"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThaanaInput, ThaanaTextarea } from "./thaana-input";
import { DiagramField } from "./diagram-field";
import { Textarea } from "@/components/ui/textarea";
import {
  BLOCK_LABELS,
  BLOCK_ORDER,
  HEADING_LEVELS,
  HEADING_LEVEL_LABELS,
  type BlockType,
} from "@/lib/types";
import { computeHeadingNumbers } from "@/lib/headings";
import { BlockStyleControls } from "./block-style-controls";
import { ImageUploader } from "./image-uploader";
import { PdfField } from "./pdf-field";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CopyIcon,
  PlusIcon,
  XIcon,
} from "lucide-react";

/** A block being edited — `key` is client-side only, for stable React identity. */
export interface DraftBlock {
  key: string;
  type: BlockType;
  main: string;
  sub: string;
  ref: string;
  level: number;
  image: string;
  /** Serialised BlockStyle; empty for an unstyled block. */
  style: string;
}

export function emptyBlock(type: BlockType): DraftBlock {
  return {
    key: `b${Math.random().toString(36).slice(2)}`,
    type,
    main: "",
    sub: "",
    ref: "",
    level: 1,
    image: "",
    style: "",
  };
}

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="text-muted-ink mb-1.5 text-[12.5px]">{children}</div>
);

export function BlockEditor({
  blocks,
  onChange,
}: {
  blocks: DraftBlock[];
  onChange: (next: DraftBlock[]) => void;
}) {
  const headingNumbers = computeHeadingNumbers(blocks);

  const update = (i: number, patch: Partial<DraftBlock>) =>
    onChange(blocks.map((b, j) => (j === i ? { ...b, ...patch } : b)));

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  const duplicate = (i: number) => {
    const next = [...blocks];
    next.splice(i + 1, 0, { ...blocks[i], key: `b${Math.random().toString(36).slice(2)}` });
    onChange(next);
  };

  const remove = (i: number) => onChange(blocks.filter((_, j) => j !== i));

  const add = (type: BlockType) => onChange([...blocks, emptyBlock(type)]);

  return (
    <div>
      {blocks.map((b, i) => (
        <div key={b.key} className="border-rule mb-3 rounded-sm border bg-[#FFFFFF]">
          <div className="border-rule-soft flex flex-wrap items-center justify-between gap-2.5 border-b bg-[#E9F2FB] px-3 py-2">
            <div className="flex items-center gap-2.5">
              <span className="font-arabic min-w-3.5 text-center text-[12px] text-[#6E82A6]">
                {i + 1}
              </span>
              {/* The label is the control: changing type keeps the text, so a
                  paragraph can become a heading without retyping it. */}
              <select
                value={b.type}
                onChange={(e) => update(i, { type: e.target.value as BlockType })}
                aria-label="ބްލޮކްގެ ބާވަތް"
                className="text-brand hover:bg-paper-2 focus-visible:ring-brand/40 -mx-1 cursor-pointer rounded-sm border-0 bg-transparent px-1 py-0.5 text-[13.5px] leading-[1.8] focus-visible:ring-2 focus-visible:outline-none"
              >
                {BLOCK_ORDER.map((t) => (
                  <option key={t} value={t}>
                    {BLOCK_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-0.5">
              <BlockStyleControls
                value={b.style}
                onChange={(style) => update(i, { style })}
              />
              <IconBtn label="މައްޗަށް" onClick={() => move(i, -1)} disabled={i === 0}>
                <ArrowUpIcon className="size-3.5" />
              </IconBtn>
              <IconBtn
                label="ތިރިއަށް"
                onClick={() => move(i, 1)}
                disabled={i === blocks.length - 1}
              >
                <ArrowDownIcon className="size-3.5" />
              </IconBtn>
              <IconBtn label="ކޮޕީ" onClick={() => duplicate(i)}>
                <CopyIcon className="size-3.5" />
              </IconBtn>
              <IconBtn label="ފޮހެލާ" onClick={() => remove(i)} destructive>
                <XIcon className="size-4" />
              </IconBtn>
            </div>
          </div>

          <div className="px-4 pt-3.5 pb-4">
            {b.type === "text" && (
              <ThaanaTextarea
                rows={4}
                value={b.main}
                onValueChange={(v) => update(i, { main: v })}
                placeholder="ފޮޅުވަތް ލިޔުއްވާ…"
                className="text-[17px] leading-[2.15]"
              />
            )}

            {b.type === "heading" && (
              <div className="grid gap-2.5">
                <div>
                  <FieldLabel>ކުޑަ ސުރުޚީ (އިޚްތިޔާރީ)</FieldLabel>
                  <ThaanaInput
                    value={b.sub}
                    onValueChange={(v) => update(i, { sub: v })}
                    placeholder="ބޮޑު ސުރުޚީގެ މަތީގައި ދައްކާ ކުޑަ ސަތުރު…"
                    className="text-brand-accent text-[13.5px]"
                  />
                </div>
                <ThaanaInput
                  value={b.main}
                  onValueChange={(v) => update(i, { main: v })}
                  placeholder="ސުރުޚީ…"
                  className="font-heading h-auto py-3 text-[25px] leading-[1.6]"
                />
                <div className="flex flex-wrap items-center gap-1.5">
                  {HEADING_LEVELS.map((lvl) => (
                    <Button
                      key={lvl}
                      type="button"
                      size="sm"
                      variant={b.level === lvl ? "default" : "outline"}
                      onClick={() => update(i, { level: lvl })}
                      className="font-arabic"
                    >
                      H{lvl}
                    </Button>
                  ))}
                  <span className="text-faint-ink text-[13px]">
                    {HEADING_LEVEL_LABELS[b.level] ?? HEADING_LEVEL_LABELS[1]}
                  </span>
                  {headingNumbers[i] && (
                    <span className="text-brand-accent font-arabic text-[13px] tabular-nums">
                      ނަންބަރު: {headingNumbers[i]}
                    </span>
                  )}
                </div>
              </div>
            )}

            {b.type === "subheading" && (
              <div className="grid gap-2.5">
                <div>
                  <FieldLabel>ކުޑަ ލޭބަލް (އިޚްތިޔާރީ)</FieldLabel>
                  <ThaanaInput
                    value={b.sub}
                    onValueChange={(v) => update(i, { sub: v })}
                    placeholder="ލޭބަލް…"
                    className="text-brand-accent text-[13px]"
                  />
                </div>
                <ThaanaInput
                  value={b.main}
                  onValueChange={(v) => update(i, { main: v })}
                  placeholder="ދަށު ސުރުޚީ…"
                  className="h-auto py-2.5 text-[19px] font-semibold"
                />
                <div className="flex flex-wrap items-center gap-1.5">
                  {[1, 2, 3].map((lvl) => (
                    <Button
                      key={lvl}
                      type="button"
                      size="sm"
                      variant={b.level === lvl ? "default" : "outline"}
                      onClick={() => update(i, { level: lvl })}
                    >
                      {[22, 19.2, 17][lvl - 1]}px
                    </Button>
                  ))}
                  <span className="text-faint-ink text-[13px]">ބޮޑީ ފޮންޓު</span>
                </div>
              </div>
            )}

            {b.type === "quote" && (
              <div className="grid gap-3">
                <div>
                  <FieldLabel>ނަޤުލު</FieldLabel>
                  <ThaanaTextarea
                    rows={3}
                    value={b.main}
                    onValueChange={(v) => update(i, { main: v })}
                    placeholder="ނަޤުލުކުރައްވާ ބަސްފުޅު…"
                    className="text-[17px] leading-[2.15]"
                  />
                </div>
                <div className="flex flex-wrap gap-3">
                  <div className="flex-1">
                    <FieldLabel>ބުނުއްވި ފަރާތް</FieldLabel>
                    <ThaanaInput
                      value={b.sub}
                      onValueChange={(v) => update(i, { sub: v })}
                      placeholder="އިމާމް ނަވަވީ…"
                    />
                  </div>
                  <div className="flex-1">
                    <FieldLabel>މަޞްދަރު</FieldLabel>
                    <Input
                      dir="rtl"
                      value={b.ref}
                      onChange={(e) => update(i, { ref: e.target.value })}
                      placeholder="شرح مسلم 3/45"
                    />
                  </div>
                </div>
              </div>
            )}

            {b.type === "qna" && (
              <div className="grid gap-3">
                <div>
                  <FieldLabel>ސުވާލު</FieldLabel>
                  <ThaanaTextarea
                    rows={2}
                    value={b.main}
                    onValueChange={(v) => update(i, { main: v })}
                    placeholder="ސުވާލު…"
                    className="text-[16.5px] leading-[2.1]"
                  />
                </div>
                <div>
                  <FieldLabel>ޖަވާބު</FieldLabel>
                  <ThaanaTextarea
                    rows={4}
                    value={b.sub}
                    onValueChange={(v) => update(i, { sub: v })}
                    placeholder="ޖަވާބު…"
                    className="text-[16.5px] leading-[2.15]"
                  />
                </div>
              </div>
            )}

            {b.type === "callout" && (
              <div className="grid gap-3">
                <div>
                  <FieldLabel>ސުރުޚީ (އިޚްތިޔާރީ)</FieldLabel>
                  <ThaanaInput
                    value={b.ref}
                    onValueChange={(v) => update(i, { ref: v })}
                    placeholder="ސަމާލުކަމަށް…"
                    className="text-brand-accent text-[13.5px]"
                  />
                </div>
                <ThaanaTextarea
                  rows={3}
                  value={b.main}
                  onValueChange={(v) => update(i, { main: v })}
                  placeholder="މުހިންމު ނުކުތާ…"
                  className="text-[16.5px] leading-[2.1]"
                />
              </div>
            )}

            {b.type === "reference" && (
              <div className="grid gap-3">
                <div>
                  <FieldLabel>ސުރުޚީ</FieldLabel>
                  <ThaanaInput
                    value={b.ref}
                    onValueChange={(v) => update(i, { ref: v })}
                    placeholder="މަޞްދަރުތައް"
                  />
                </div>
                <div>
                  <FieldLabel>ކޮންމެ ސަތުރެއްގައި އެއް މަޞްދަރު</FieldLabel>
                  <Textarea
                    dir="rtl"
                    rows={4}
                    value={b.main}
                    onChange={(e) => update(i, { main: e.target.value })}
                    placeholder="صحيح البخاري…"
                    className="text-[15.5px] leading-[2.1]"
                  />
                </div>
              </div>
            )}

            {b.type === "ayah" && (
              <div className="grid gap-3">
                <div>
                  <FieldLabel>
                    <span className="text-brand-accent">آية — ޤުރުއާނީ ފޮންޓު</span>
                  </FieldLabel>
                  <Textarea
                    dir="rtl"
                    rows={3}
                    value={b.main}
                    onChange={(e) => update(i, { main: e.target.value })}
                    placeholder="آية…"
                    className="font-quran bg-[#E9F2FB] text-center text-[24px] leading-[2.2]"
                  />
                </div>
                <div>
                  <FieldLabel>ދިވެހި ތަރުޖަމާ</FieldLabel>
                  <ThaanaTextarea
                    rows={3}
                    value={b.sub}
                    onValueChange={(v) => update(i, { sub: v })}
                    placeholder="ތަރުޖަމާ…"
                    className="text-[16.5px] leading-[2.15]"
                  />
                </div>
                <div className="flex flex-wrap items-end gap-4">
                  <div>
                    <FieldLabel>ސޫރަތާއި އާޔަތް ނަންބަރު</FieldLabel>
                    <Input
                      dir="rtl"
                      value={b.ref}
                      onChange={(e) => update(i, { ref: e.target.value })}
                      placeholder="البقرة ١٨٣"
                      className="font-arabic w-[280px] max-w-full text-[16px]"
                    />
                  </div>
                  <div>
                    <FieldLabel>ދައްކާ ގޮތް</FieldLabel>
                    <div className="flex gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant={b.level === 1 ? "default" : "outline"}
                        onClick={() => update(i, { level: 1 })}
                      >
                        ފްރޭމް
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={b.level === 0 ? "default" : "outline"}
                        onClick={() => update(i, { level: 0 })}
                      >
                        ސާދާ
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {b.type === "hadith" && (
              <div className="grid gap-3">
                <div>
                  <FieldLabel>
                    <span className="text-brand-accent">ޙަދީޘްގެ ޢަރަބި މަތުނު</span>
                  </FieldLabel>
                  <Textarea
                    dir="rtl"
                    rows={3}
                    value={b.main}
                    onChange={(e) => update(i, { main: e.target.value })}
                    placeholder="الحديث…"
                    className="font-arabic bg-paper-4 text-center text-[22px] leading-[2.1]"
                  />
                </div>
                <div>
                  <FieldLabel>ދިވެހި ތަރުޖަމާ</FieldLabel>
                  <ThaanaTextarea
                    rows={3}
                    value={b.sub}
                    onValueChange={(v) => update(i, { sub: v })}
                    placeholder="ތަރުޖަމާ…"
                    className="text-[16.5px] leading-[2.15]"
                  />
                </div>
                <div>
                  <FieldLabel>މަޞްދަރު</FieldLabel>
                  <ThaanaInput
                    value={b.ref}
                    onValueChange={(v) => update(i, { ref: v })}
                    placeholder="ބުޚާރީ 1، މުސްލިމް 1907"
                    className="w-[320px] max-w-full text-[15.5px]"
                  />
                </div>
              </div>
            )}

            {b.type === "image" && (
              <div className="grid gap-2.5">
                <div>
                  <FieldLabel>ފޮޓޯ</FieldLabel>
                  <ImageUploader
                    value={b.image}
                    onChange={(url) => update(i, { image: url })}
                  />
                </div>
                <div>
                  <FieldLabel>ފޮޓޯގެ ތަޢާރަފު</FieldLabel>
                  <ThaanaInput
                    value={b.main}
                    onValueChange={(v) => update(i, { main: v })}
                    placeholder="ފޮޓޯގެ ތަޢާރަފު…"
                  />
                </div>
              </div>
            )}

            {b.type === "pdf" && (
              <div className="grid gap-2.5">
                <div>
                  <FieldLabel>PDF ފައިލް</FieldLabel>
                  <PdfField value={b.main} onChange={(url) => update(i, { main: url })} />
                </div>
                <div>
                  <FieldLabel>ފައިލްގެ ނަން</FieldLabel>
                  <ThaanaInput
                    value={b.ref}
                    onValueChange={(v) => update(i, { ref: v })}
                    placeholder="ދައްކާނެ ނަން…"
                  />
                </div>
                <div>
                  <FieldLabel>ތަޢާރަފު</FieldLabel>
                  <ThaanaInput
                    value={b.sub}
                    onValueChange={(v) => update(i, { sub: v })}
                    placeholder="ތިރީގައި ދައްކާނެ ތަޢާރަފު…"
                  />
                </div>
              </div>
            )}

            {b.type === "list" && (
              <div>
                <FieldLabel>ކޮންމެ ސަތުރެއްގައި އެއް ނުކުތާ</FieldLabel>
                <ThaanaTextarea
                  rows={5}
                  value={b.main}
                  onValueChange={(v) => update(i, { main: v })}
                  placeholder="ފުރަތަމަ ނުކުތާ…"
                  className="text-[16.5px] leading-[2.15]"
                />
              </div>
            )}

            {b.type === "note" && (
              <div>
                <FieldLabel>ފާހަގަ</FieldLabel>
                <ThaanaTextarea
                  rows={3}
                  value={b.main}
                  onValueChange={(v) => update(i, { main: v })}
                  placeholder="ފާހަގަކުރައްވާ…"
                  className="text-[15.5px] leading-[2.1]"
                />
              </div>
            )}

            {b.type === "diagram" && (
              <DiagramField
                outline={b.main}
                caption={b.sub}
                onOutlineChange={(v) => update(i, { main: v })}
                onCaptionChange={(v) => update(i, { sub: v })}
              />
            )}

            {b.type === "divider" && (
              <div className="flex items-center justify-center gap-2.5 py-1.5 text-[#9FD8F5]">
                <span className="h-px w-[60px] bg-[#C7DCF0]" />
                <span className="font-arabic text-[17px]">۞</span>
                <span className="h-px w-[60px] bg-[#C7DCF0]" />
              </div>
            )}
          </div>
        </div>
      ))}

      <div className="mt-4 rounded-sm border border-dashed border-[#B5D2EA] bg-[#FAFCFF] p-4">
        <div className="text-muted-ink mb-3 text-[14px] leading-[1.8]">ބްލޮކް އިތުރުކުރައްވާ</div>
        <div className="flex flex-wrap gap-2">
          {BLOCK_ORDER.map((type) => (
            <Button key={type} type="button" variant="outline" onClick={() => add(type)}>
              <PlusIcon className="size-3.5" />
              {BLOCK_LABELS[type]}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

function IconBtn({
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
      className={`grid size-9 place-items-center rounded-sm border border-transparent transition-colors disabled:opacity-30 ${
        destructive
          ? "text-faint-ink hover:border-[#C68B7B] hover:text-[#A8402A]"
          : "text-muted-ink hover:border-rule-strong hover:text-brand"
      }`}
    >
      {children}
    </button>
  );
}
