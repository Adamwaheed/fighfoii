"use client";

import { useState } from "react";
import Link from "next/link";
import { List, X } from "lucide-react";
import type { TocEntry } from "@/lib/reading";

/**
 * Chapter list. Inline beside the text on wide screens, a drawer below that —
 * a table of contents is worth permanent space when there is room for it.
 */
export function ReaderToc({
  slug,
  entries,
  currentPage,
}: {
  slug: string;
  entries: TocEntry[];
  currentPage: number;
}) {
  const [open, setOpen] = useState(false);
  if (!entries.length) return null;

  // The chapter in view is the last one starting at or before the current page.
  const activeId = entries.reduce<number | null>(
    (found, e) => (e.startPage <= currentPage ? e.id : found),
    null
  );

  const list = (
    <ul className="flex flex-col gap-0.5">
      {entries.map((e) => {
        const active = e.id === activeId;
        const reachable = e.firstPage !== null;

        const inner = (
          <>
            <span className="flex-1 text-pretty">{e.title}</span>
            <span className="font-arabic text-faint-ink flex-none text-[11.5px] tabular-nums">
              {e.startPage}
            </span>
          </>
        );

        const indent = ["ps-0", "ps-3", "ps-6", "ps-9"][Math.min(Math.max(e.level - 1, 0), 3)];

        return (
          <li key={e.id}>
            {reachable ? (
              <Link
                href={`/library/${slug}/read?page=${e.firstPage}`}
                onClick={() => setOpen(false)}
                className={`flex items-baseline gap-2 rounded-[4px] px-2.5 py-2 text-[14px] leading-[1.85] transition-colors ${indent} ${
                  active
                    ? "bg-paper-2 text-brand font-semibold"
                    : "text-[#2A3D66] hover:bg-paper-2"
                }`}
              >
                {inner}
              </Link>
            ) : (
              // No translated pages inside it yet — shown, but not a dead link.
              <span
                className={`text-faint-ink flex items-baseline gap-2 px-2.5 py-2 text-[14px] leading-[1.85] ${indent}`}
                title="މި ބާބު އަދި ތަރުޖަމާ ނުކުރެވޭ"
              >
                {inner}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      <aside className="sticky top-24 hidden max-h-[calc(100svh-8rem)] w-[260px] flex-none overflow-y-auto lg:block">
        <h2 className="text-faint-ink mb-2 px-2.5 text-[12px] leading-[1.9] tracking-[0.04em]">
          ފިހުރިސްތު
        </h2>
        {list}
      </aside>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="border-rule bg-paper-4 text-brand-deep hover:border-rule-strong fixed bottom-6 end-6 z-30 inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-[14px] leading-[1.7] shadow-[0_6px_18px_rgba(11,26,61,0.12)] transition-colors lg:hidden"
      >
        <List className="size-[18px]" aria-hidden />
        ފިހުރިސްތު
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="ބަންދުކުރައްވާ"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-black/25 lg:hidden"
          />
          <div className="bg-paper border-rule fixed inset-y-0 start-0 z-50 flex w-[86%] max-w-[320px] flex-col border-e shadow-[0_0_40px_rgba(11,26,61,0.18)] lg:hidden">
            <header className="border-rule-soft flex items-center justify-between border-b px-4 py-3.5">
              <h2 className="font-heading text-heading-ink text-[19px] leading-[1.6]">
                ފިހުރިސްތު
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="ބަންދުކުރައްވާ"
                className="text-muted-ink hover:bg-paper-2 hover:text-ink inline-flex size-9 items-center justify-center rounded-[4px] transition-colors"
              >
                <X className="size-5" aria-hidden />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">{list}</div>
          </div>
        </>
      )}
    </>
  );
}
