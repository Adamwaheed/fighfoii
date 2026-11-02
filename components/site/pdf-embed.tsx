"use client";

import { useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { PdfPageView } from "@/components/pdf-page-view";

/**
 * A PDF embedded inside an article.
 *
 * Rendered through the same canvas viewer the library uses, rather than an
 * <iframe>: the browser's built-in viewer is left-to-right, ignores the page's
 * theme, and on mobile often refuses to render inline at all.
 */
export function PdfEmbed({ url }: { url: string }) {
  const [pageNo, setPageNo] = useState(1);
  const [pages, setPages] = useState(0);

  return (
    <div>
      <PdfPageView
        url={url}
        pageNo={pageNo}
        className="h-[62svh] w-full"
        onLoaded={setPages}
      />

      {pages > 1 && (
        <div className="border-rule-soft flex items-center justify-center gap-2 border-t py-2">
          <button
            type="button"
            onClick={() => setPageNo((p) => Math.max(1, p - 1))}
            disabled={pageNo <= 1}
            aria-label="ކުރީ ޞަފުޙާ"
            className="text-brand-deep hover:bg-paper-2 inline-flex size-9 items-center justify-center rounded-[4px] transition-colors disabled:opacity-35"
          >
            <ChevronRightIcon className="size-4" />
          </button>

          <span className="font-arabic text-muted-ink min-w-16 text-center text-[13px] tabular-nums">
            {pageNo} / {pages}
          </span>

          <button
            type="button"
            onClick={() => setPageNo((p) => Math.min(pages, p + 1))}
            disabled={pageNo >= pages}
            aria-label="ފަހު ޞަފުޙާ"
            className="text-brand-deep hover:bg-paper-2 inline-flex size-9 items-center justify-center rounded-[4px] transition-colors disabled:opacity-35"
          >
            <ChevronLeftIcon className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}
