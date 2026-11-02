"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  BG_SWATCHES,
  DEFAULT_BLOCK_STYLE,
  STYLE_PRESETS,
  blockStyleCss,
  isPlain,
  parseBlockStyle,
  serializeBlockStyle,
  type BlockStyle,
} from "@/lib/block-style";
import { PaletteIcon, RotateCcwIcon } from "lucide-react";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-muted-ink text-[12.5px]">{label}</Label>
      {children}
    </div>
  );
}

/**
 * Surface controls for a single block — background, border, radius, lift,
 * opacity and background image, plus one-click presets.
 */
export function BlockStyleControls({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const style = parseBlockStyle(value);
  const plain = isPlain(style);

  const set = (patch: Partial<BlockStyle>) =>
    onChange(serializeBlockStyle({ ...style, ...patch }));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="ބްލޮކްގެ ސިފަ"
          aria-label="ބްލޮކްގެ ސިފަ"
          className={`grid size-9 place-items-center rounded-sm border transition-colors ${
            plain
              ? "text-muted-ink hover:border-rule-strong hover:text-brand border-transparent"
              : "border-brand text-brand"
          }`}
        >
          <PaletteIcon className="size-3.5" />
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-[300px] p-4">
        <div className="grid gap-4">
          <div className="flex items-center justify-between gap-2">
            <span className="font-heading text-[15px]">ބްލޮކްގެ ސިފަ</span>
            {!plain && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => onChange("")}
                className="h-7 px-2 text-[12px]"
              >
                <RotateCcwIcon className="size-3" />
                ސާފުކުރޭ
              </Button>
            )}
          </div>

          <Row label="ތައްޔާރު ސިފަ">
            <div className="flex flex-wrap gap-1.5">
              {STYLE_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onChange(serializeBlockStyle(p.style))}
                  className="border-rule hover:border-brand grid h-11 flex-1 basis-14 place-items-center border text-[11px] transition-colors"
                  style={{
                    ...blockStyleCss(p.style),
                    padding: 0,
                    opacity: 1,
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </Row>

          <Row label="ބެކްގްރައުންޑް ކުލަ">
            <div className="flex flex-wrap gap-1.5">
              {BG_SWATCHES.map((sw) => (
                <button
                  key={sw.value || "none"}
                  type="button"
                  title={sw.label}
                  aria-label={sw.label}
                  onClick={() => set({ bg: sw.value })}
                  className={`size-7 rounded-sm border transition-[box-shadow] ${
                    style.bg === sw.value
                      ? "border-brand ring-brand/40 ring-2"
                      : "border-rule"
                  }`}
                  style={{
                    background: sw.value || "transparent",
                    backgroundImage: sw.value
                      ? undefined
                      : "linear-gradient(45deg,transparent 45%,#A9C4DF 45%,#A9C4DF 55%,transparent 55%)",
                  }}
                />
              ))}
              <Input
                type="color"
                value={style.bg || "#F4F8FD"}
                onChange={(e) => set({ bg: e.target.value })}
                aria-label="އަމިއްލަ ކުލަ"
                className="h-7 w-10 cursor-pointer p-0.5"
              />
            </div>
          </Row>

          <div className="flex items-center justify-between gap-2">
            <Label className="text-muted-ink text-[12.5px]">ބޯޑަރު</Label>
            <Switch
              checked={style.border}
              onCheckedChange={(v) => set({ border: v })}
              aria-label="ބޯޑަރު"
            />
          </div>

          <Row label={`ކަނުގެ ވަށްބުރު — ${style.radius}px`}>
            <Slider
              value={[style.radius]}
              min={0}
              max={24}
              step={1}
              onValueChange={([v]) => set({ radius: v })}
            />
          </Row>

          <Row label={`އުފުލުން — ${style.lift}`}>
            <Slider
              value={[style.lift]}
              min={0}
              max={3}
              step={1}
              onValueChange={([v]) => set({ lift: v })}
            />
          </Row>

          <Row label={`ފުޅާކަން — ${style.pad}`}>
            <Slider
              value={[style.pad]}
              min={0}
              max={3}
              step={1}
              onValueChange={([v]) => set({ pad: v })}
            />
          </Row>

          <Row label={`ސާފުކަން — ${style.opacity}%`}>
            <Slider
              value={[style.opacity]}
              min={10}
              max={100}
              step={5}
              onValueChange={([v]) => set({ opacity: v })}
            />
          </Row>

          <Row label="ބެކްގްރައުންޑް ފޮޓޯ">
            <Input
              dir="ltr"
              value={style.bgImage}
              onChange={(e) => set({ bgImage: e.target.value })}
              placeholder="https://…"
              className="h-8 text-start font-mono text-[11px]"
            />
          </Row>

          <div
            className="border-rule grid min-h-14 place-items-center border border-dashed"
            aria-hidden
          >
            <div
              className="text-muted-ink w-full text-center text-[12px]"
              style={
                isPlain(style)
                  ? { padding: "10px" }
                  : blockStyleCss({ ...style, ...(style.pad ? {} : { pad: 1 }) })
              }
            >
              {DEFAULT_BLOCK_STYLE.bg === style.bg && plain
                ? "ސާދާ ބްލޮކެއް"
                : "ނަމޫނާ"}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
