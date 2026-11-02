import type { CSSProperties } from "react";

/**
 * Per-block presentation. Stored as JSON on the block row, with only
 * non-default keys serialised so untouched blocks cost nothing.
 */
export interface BlockStyle {
  /** Panel background. Empty means transparent. */
  bg: string;
  /** Draw a hairline border. */
  border: boolean;
  /** Border colour; falls back to the palette rule colour. */
  borderColor: string;
  /** Corner radius in px. */
  radius: number;
  /** Paper-shadow depth, 0–3. */
  lift: number;
  /** 10–100. */
  opacity: number;
  /** Background image URL, layered under the content. */
  bgImage: string;
  /** Inner padding step, 0–3 — panels need room once they have a background. */
  pad: number;
}

export const DEFAULT_BLOCK_STYLE: BlockStyle = {
  bg: "",
  border: false,
  borderColor: "",
  radius: 0,
  lift: 0,
  opacity: 100,
  bgImage: "",
  pad: 0,
};

/** Shadow ramp for the "lift" control — tinted with the ink navy, not neutral grey. */
const LIFT_SHADOWS = [
  "none",
  "0 1px 2px rgba(11, 26, 61, 0.07)",
  "0 2px 8px rgba(11, 26, 61, 0.10)",
  "0 8px 24px rgba(11, 26, 61, 0.15)",
];

const PAD_STEPS = ["0", "10px 14px", "18px 22px", "28px 32px"];

export function parseBlockStyle(raw: string | null | undefined): BlockStyle {
  if (!raw) return { ...DEFAULT_BLOCK_STYLE };
  try {
    const parsed = JSON.parse(raw) as Partial<BlockStyle>;
    return { ...DEFAULT_BLOCK_STYLE, ...parsed };
  } catch {
    // A malformed value should not take the article down with it.
    return { ...DEFAULT_BLOCK_STYLE };
  }
}

/** Serialises only what differs from the defaults; returns "" for a plain block. */
export function serializeBlockStyle(style: BlockStyle): string {
  const diff: Partial<BlockStyle> = {};
  (Object.keys(DEFAULT_BLOCK_STYLE) as (keyof BlockStyle)[]).forEach((k) => {
    if (style[k] !== DEFAULT_BLOCK_STYLE[k]) {
      // @ts-expect-error — key/value pairs stay aligned by construction.
      diff[k] = style[k];
    }
  });
  return Object.keys(diff).length ? JSON.stringify(diff) : "";
}

export function isPlain(style: BlockStyle): boolean {
  return serializeBlockStyle(style) === "";
}

/** Inline CSS for a styled block wrapper. */
export function blockStyleCss(style: BlockStyle): CSSProperties {
  const css: CSSProperties = {};

  if (style.bg) css.backgroundColor = style.bg;
  if (style.bgImage) {
    css.backgroundImage = `url(${JSON.stringify(style.bgImage)})`;
    css.backgroundSize = "cover";
    css.backgroundPosition = "center";
  }
  if (style.border) {
    css.borderWidth = 1;
    css.borderStyle = "solid";
    css.borderColor = style.borderColor || "var(--rule)";
  }
  if (style.radius) css.borderRadius = `${style.radius}px`;
  if (style.lift) css.boxShadow = LIFT_SHADOWS[Math.min(style.lift, 3)];
  if (style.opacity !== 100) css.opacity = style.opacity / 100;

  // Anything with a surface needs padding, or the text sits on the edge.
  const padStep = style.pad || (style.bg || style.bgImage || style.border ? 2 : 0);
  if (padStep) css.padding = PAD_STEPS[Math.min(padStep, 3)];

  return css;
}

/** One-click looks; each writes a full style so switching presets is clean. */
export const STYLE_PRESETS: { id: string; label: string; style: BlockStyle }[] = [
  { id: "plain", label: "ސާދާ", style: { ...DEFAULT_BLOCK_STYLE } },
  {
    id: "outlined",
    label: "ބޯޑަރު",
    style: { ...DEFAULT_BLOCK_STYLE, border: true, radius: 3, pad: 2 },
  },
  {
    id: "card",
    label: "ކާޑު",
    style: {
      ...DEFAULT_BLOCK_STYLE,
      bg: "#FFFFFF",
      border: true,
      radius: 6,
      lift: 1,
      pad: 2,
    },
  },
  {
    id: "paper",
    label: "ކަރުދާސް",
    style: { ...DEFAULT_BLOCK_STYLE, bg: "#E7F1FB", radius: 4, lift: 2, pad: 2 },
  },
  {
    id: "raised",
    label: "އުފުލިފައި",
    style: {
      ...DEFAULT_BLOCK_STYLE,
      bg: "#FFFFFF",
      radius: 10,
      lift: 3,
      pad: 3,
    },
  },
];

/** Palette swatches offered in the colour picker. */
export const BG_SWATCHES = [
  { value: "", label: "ނެތް" },
  { value: "#F4F8FD", label: "ކަރުދާސް" },
  { value: "#E7F1FB", label: "ފަނޑު" },
  { value: "#D9E8F7", label: "ފަނޑު 2" },
  { value: "#FFFFFF", label: "ހުދު" },
  { value: "#BFE4F8", label: "ނޫ ފަނޑު" },
  { value: "#1B62C4", label: "ގަދަ ނޫ" },
  { value: "#0A2E75", label: "ކަނު ނޫ" },
];
