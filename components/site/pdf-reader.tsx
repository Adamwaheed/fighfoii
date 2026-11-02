"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon, DownloadIcon } from "lucide-react";
import { PdfPageView } from "@/components/pdf-page-view";
import { getBookState, saveProgress, subscribe } from "@/lib/reader-store";

/**
 * Reading view for a book that has no translation yet — the scan itself.
 *
 * Deliberately the same shape as the translated reader: one page at a time,
 * position remembered, keyboard navigation. A book without a translation is
 * still a book, and it should not feel like a file preview bolted to a page.
 */
export function PdfReader({
  slug,
  url,
  pageCount,
  initialPage,
}: {
  slug: string;
  url: string;
  pageCount: number;
  initialPage: number;
}) {
  const clamp = useCallback(
    (n: number) => Math.min(Math.max(n, 1), Math.max(pageCount, 1)),
    [pageCount]
  );

  // Saved progress is browser state, so it is read through an external store:
  // the server snapshot is 0, and the resume only appears after hydration.
  const saved = useSyncExternalStore(
    subscribe,
    () => getBookState(slug).page,
    () => 0
  );

  const [chosen, setChosen] = useState<number | null>(null);
  const [jump, setJump] = useState("");

  // An explicit ?page wins; otherwise pick up where the reader left off.
  const pageNo = clamp(chosen ?? (initialPage > 1 ? initialPage : saved || 1));
  const setPageNo = (next: number | ((p: number) => number)) =>
    setChosen(clamp(typeof next === "function" ? next(pageNo) : next));

  // The resolved page, kept where the key handler can read it without the
  // listener needing to be re-bound on every page turn.
  const current = useRef(pageNo);

  // Only record a position the reader actually chose. Saving on mount would
  // overwrite the stored page during hydration, when the external store still
  // reports the server snapshot — the resume would destroy itself.
  const moved = chosen !== null || initialPage > 1;

  useEffect(() => {
    current.current = pageNo;
    if (moved) saveProgress(slug, pageNo);
  }, [slug, pageNo, moved]);

  // RTL: the left arrow advances, matching the direction the pages turn.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && /^(INPUT|TEXTAREA)$/.test(el.tagName)) return;

      // Uses the current page from state rather than the render closure, so the
      // listener never needs re-binding as the page turns.
      if (e.key === "ArrowLeft" || e.key === "PageDown") {
        setChosen((p) => clamp((p ?? current.current) + 1));
      } else if (e.key === "ArrowRight" || e.key === "PageUp") {
        setChosen((p) => clamp((p ?? current.current) - 1));
      } else if (e.key === "Home") {
        setChosen(1);
      } else if (e.key === "End") {
        setChosen(pageCount);
      } else {
        return;
      }
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clamp, pageCount]);

  const submitJump = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(jump);
    if (Number.isFinite(n) && n >= 1) setPageNo(clamp(n));
    setJump("");
  };

  return (
    <div>
      <div className="border-rule-soft bg-paper-4 mb-3 flex flex-wrap items-center gap-2 rounded-[8px] border px-3 py-2">
        <button
          type="button"
          onClick={() => setPageNo((p) => clamp(p - 1))}
          disabled={pageNo <= 1}
          aria-label="ކުރީ ޞަފުޙާ"
          className="text-brand-deep hover:bg-paper-2 inline-flex size-10 items-center justify-center rounded-[4px] transition-colors disabled:opacity-35"
        >
          <ChevronRightIcon className="size-5" />
        </button>

        <form onSubmit={submitJump} className="flex items-center gap-1.5">
          <input
            value={jump}
            onChange={(e) => setJump(e.target.value.replace(/\D/g, ""))}
            placeholder={String(pageNo)}
            inputMode="numeric"
            aria-label="ޞަފުޙާއަކަށް ދާން"
            className="border-rule focus:border-brand font-arabic h-9 w-16 rounded-[4px] border bg-transparent text-center text-[14px] tabular-nums outline-none"
          />
          <span className="text-faint-ink font-arabic text-[13px] tabular-nums">
            / {pageCount}
          </span>
        </form>

        <button
          type="button"
          onClick={() => setPageNo((p) => clamp(p + 1))}
          disabled={pageNo >= pageCount}
          aria-label="ފަހު ޞަފުޙާ"
          className="text-brand-deep hover:bg-paper-2 inline-flex size-10 items-center justify-center rounded-[4px] transition-colors disabled:opacity-35"
        >
          <ChevronLeftIcon className="size-5" />
        </button>

        <div className="bg-rule-soft mx-1 hidden h-1 flex-1 overflow-hidden rounded-full sm:block">
          <div
            className="bg-brand-accent h-full rounded-full transition-[width] duration-300"
            style={{ width: `${(pageNo / Math.max(pageCount, 1)) * 100}%` }}
          />
        </div>

        <Link
          href={url}
          download
          className="border-rule text-brand-deep hover:border-rule-strong hover:bg-paper-2 ms-auto inline-flex min-h-9 items-center gap-1.5 rounded-[4px] border px-3 text-[13.5px] transition-colors"
        >
          <DownloadIcon className="size-4" />
          ޑައުންލޯޑް
        </Link>
      </div>

      <PdfPageView url={url} pageNo={pageNo} className="h-[82svh] w-full" />

      <p className="text-faint-ink mt-3 text-center text-[12.5px] leading-[1.9]">
        ސީދާ ތީރު ފިތްތަކުން ޞަފުޙާ ބަދަލުކުރެއްވޭނެ
      </p>
    </div>
  );
}
