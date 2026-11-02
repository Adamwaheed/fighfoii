"use client";

import { useSyncExternalStore } from "react";
import { MoonIcon, SunIcon, MinusIcon, PlusIcon, TypeIcon } from "lucide-react";
import {
  FONT_MAX,
  FONT_MIN,
  FONT_STEP,
  getPrefsServerSnapshot,
  getPrefsSnapshot,
  subscribePrefs,
  writePrefs,
} from "@/lib/prefs";

/** Light/dark switch. Sits in the header, so it is reachable from any page. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const prefs = useSyncExternalStore(
    subscribePrefs,
    getPrefsSnapshot,
    getPrefsServerSnapshot
  );

  // No mount flag is needed: useSyncExternalStore hydrates against the server
  // snapshot and swaps to the stored value afterwards, without a mismatch.
  const dark = prefs.theme === "dark";

  return (
    <button
      type="button"
      onClick={() => writePrefs({ ...prefs, theme: dark ? "light" : "dark" })}
      aria-label={dark ? "އަލި ތީމް" : "އަނދިރި ތީމް"}
      title={dark ? "އަލި ތީމް" : "އަނދިރި ތީމް"}
      className={`text-muted-ink hover:bg-paper-2 hover:text-ink inline-flex size-10 flex-none items-center justify-center rounded-[6px] transition-colors ${className}`}
    >
      {dark ? (
        <SunIcon className="size-[18px]" aria-hidden />
      ) : (
        <MoonIcon className="size-[18px]" aria-hidden />
      )}
    </button>
  );
}

/**
 * Text-size stepper for article pages.
 *
 * Adjusts a single CSS variable that the article body multiplies into its font
 * sizes, so headings, quotes and verses scale together instead of drifting out
 * of proportion.
 */
export function FontSizeControls({ className = "" }: { className?: string }) {
  const prefs = useSyncExternalStore(
    subscribePrefs,
    getPrefsSnapshot,
    getPrefsServerSnapshot
  );

  const step = (delta: number) =>
    writePrefs({
      ...prefs,
      fontScale: Math.min(Math.max(prefs.fontScale + delta, FONT_MIN), FONT_MAX),
    });

  return (
    <div
      className={`border-rule-soft text-muted-ink inline-flex items-center gap-0.5 rounded-[6px] border p-0.5 ${className}`}
    >
      <button
        type="button"
        onClick={() => step(-FONT_STEP)}
        disabled={prefs.fontScale <= FONT_MIN}
        aria-label="އަކުރު ކުޑަކުރައްވާ"
        title="އަކުރު ކުޑަކުރައްވާ"
        className="hover:bg-paper-2 hover:text-ink inline-flex size-8 items-center justify-center rounded-[4px] transition-colors disabled:opacity-35"
      >
        <MinusIcon className="size-3.5" aria-hidden />
      </button>

      <TypeIcon className="size-4 flex-none opacity-70" aria-hidden />

      <button
        type="button"
        onClick={() => step(FONT_STEP)}
        disabled={prefs.fontScale >= FONT_MAX}
        aria-label="އަކުރު ބޮޑުކުރައްވާ"
        title="އަކުރު ބޮޑުކުރައްވާ"
        className="hover:bg-paper-2 hover:text-ink inline-flex size-8 items-center justify-center rounded-[4px] transition-colors disabled:opacity-35"
      >
        <PlusIcon className="size-3.5" aria-hidden />
      </button>

      {prefs.fontScale !== 100 && (
        <button
          type="button"
          onClick={() => writePrefs({ ...prefs, fontScale: 100 })}
          className="font-arabic hover:text-ink px-1.5 text-[11.5px] tabular-nums transition-colors"
          title="އަޞްލު މިންވަރަށް"
        >
          {prefs.fontScale}%
        </button>
      )}
    </div>
  );
}
