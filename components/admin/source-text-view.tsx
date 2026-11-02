"use client";

import { Textarea } from "@/components/ui/textarea";

/**
 * Source pane for a pasted-text book. Mirrors the PDF viewer's shell — same
 * frame and the same capture overlay — so both book kinds behave alike.
 */
export function SourceTextView({
  value,
  onChange,
  pageNo,
  scanning = false,
  elapsed = 0,
  className = "",
  readOnly = false,
}: {
  value: string;
  onChange: (next: string) => void;
  pageNo: number;
  scanning?: boolean;
  elapsed?: number;
  className?: string;
  /** The facing page in a spread: shown for context, edited on its own page. */
  readOnly?: boolean;
}) {
  return (
    <div className={`flex flex-col ${className}`}>
      <div className="border-rule text-muted-ink flex items-center gap-2 border-b px-3 py-2 text-[12.5px]">
        <span>ޢަރަބި މަތުނު</span>
        <span className="font-arabic ms-auto tabular-nums">ޞަފުޙާ {pageNo}</span>
      </div>

      <div className="bg-paper-3 relative flex-1 overflow-auto p-3">
        <Textarea
          dir="rtl"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          placeholder="ޢަރަބި ލިޔުން…"
          className="font-arabic bg-card h-full min-h-[60svh] resize-none text-[19px] leading-[2.1]"
        />

        {scanning && (
          <div
            className="scan-overlay pointer-events-none absolute inset-3"
            role="status"
            aria-live="polite"
          >
            <span className="sr-only">ޞަފުޙާ ކިޔައި ތަރުޖަމާކުރަނީ</span>
            <span className="scan-corner scan-corner--tl" />
            <span className="scan-corner scan-corner--tr" />
            <span className="scan-corner scan-corner--bl" />
            <span className="scan-corner scan-corner--br" />
            <span className="scan-beam" />
            <span className="scan-pill">
              <span className="scan-dot" />
              ތަރުޖަމާކުރަނީ… {elapsed > 0 && <span className="font-arabic tabular-nums">{elapsed}s</span>}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
