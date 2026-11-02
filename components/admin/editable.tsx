"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { getThaanaChar } from "@/lib/thaana-keyboard";
import { PASSTHROUGH_KEYS } from "@/hooks/use-thaana-keyboard";
import { useThaanaEnabled } from "./thaana-input";

/**
 * An uncontrolled contentEditable region.
 *
 * The text is written into the DOM once on mount and never pushed back in from
 * props — that one-way flow is what keeps the caret from jumping to the end on
 * every keystroke. Remounting (via `key`) is how callers force a reset.
 */
export function Editable({
  value,
  onChange,
  as: Tag = "div",
  className,
  placeholder,
  onKeyDown,
  ariaLabel,
  style,
  thaana = true,
}: {
  value: string;
  onChange: (next: string) => void;
  as?: "div" | "p" | "h1" | "h2" | "h3" | "span" | "li";
  className?: string;
  placeholder?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLElement>) => void;
  ariaLabel?: string;
  style?: React.CSSProperties;
  /** Phonetic Thaana input. Turn off for fields that hold Arabic. */
  thaana?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const seeded = useRef<HTMLElement | null>(null);
  const [thaanaEnabled] = useThaanaEnabled();
  const thaanaActive = thaana && thaanaEnabled;

  // Seed the text whenever a *new* DOM node appears, not merely on mount.
  //
  // Changing a heading's level swaps the rendered tag (h2 -> h3 -> div), and
  // because `Editable` is the same component type either side, React replaces
  // the DOM node without remounting the component. A mount-only effect never
  // re-runs, so the replacement node was left empty and the text vanished.
  //
  // Writing only when the node identity changes keeps the one-way flow that
  // stops the caret jumping while typing.
  useEffect(() => {
    const node = ref.current;
    if (!node || seeded.current === node) return;
    seeded.current = node;
    if (node.textContent !== value) node.textContent = value;
  });

  return (
    <Tag
      // @ts-expect-error — one ref type across the allowed tag union.
      ref={ref}
      role="textbox"
      aria-label={ariaLabel}
      aria-multiline="true"
      tabIndex={0}
      contentEditable
      suppressContentEditableWarning
      dir="rtl"
      data-placeholder={placeholder}
      onInput={(e: React.FormEvent<HTMLElement>) =>
        onChange(e.currentTarget.textContent ?? "")
      }
      onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
        // Phonetic mapping for contentEditable. execCommand is used rather than
        // manual range surgery because it keeps the browser's own undo stack
        // intact, which a programmatic DOM edit would break.
        if (
          thaanaActive &&
          !e.ctrlKey &&
          !e.metaKey &&
          !e.altKey &&
          !PASSTHROUGH_KEYS.has(e.key)
        ) {
          const ch = getThaanaChar(e.key);
          if (ch) {
            e.preventDefault();
            document.execCommand("insertText", false, ch);
            // execCommand does not fire React's onInput, so publish the change.
            onChange(e.currentTarget.textContent ?? "");
            return;
          }
        }
        onKeyDown?.(e);
      }}
      onPaste={(e: React.ClipboardEvent<HTMLElement>) => {
        // Paste as plain text; pasted markup would fight the reader styles.
        e.preventDefault();
        const text = e.clipboardData.getData("text/plain");
        document.execCommand("insertText", false, text);
      }}
      className={cn("editable", className)}
      style={style}
    />
  );
}
