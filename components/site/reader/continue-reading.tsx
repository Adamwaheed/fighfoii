"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpenText } from "lucide-react";
import { getBookState, subscribe } from "@/lib/reader-store";

/**
 * Entry point into the reading view, which becomes "continue from page N" once
 * the reader has been here before.
 *
 * Progress lives in localStorage, so it is unknown during the server render.
 * The label therefore starts as the plain invitation and only becomes the
 * resume form after mount — rendering the resume text straight away would
 * mismatch the server HTML.
 */
export function ContinueReading({
  slug,
  firstPage,
  label = "ތަރުޖަމާ ކިޔުއްވާ",
  className = "",
}: {
  slug: string;
  firstPage: number;
  /** A scanned book is read, not translated — the invitation should say so. */
  label?: string;
  className?: string;
}) {
  const [page, setPage] = useState<number | null>(null);

  useEffect(() => {
    const sync = () => {
      const s = getBookState(slug);
      setPage(s.updatedAt && s.page ? s.page : null);
    };
    sync();
    return subscribe(sync);
  }, [slug]);

  const target = page ?? firstPage;

  return (
    <Link
      href={`/library/${slug}/read?page=${target}`}
      className={`border-brand bg-brand text-paper hover:bg-brand-deep hover:border-brand-deep inline-flex min-h-11 items-center gap-2 rounded-sm border px-5 text-[15px] leading-[1.6] transition-colors ${className}`}
    >
      <BookOpenText className="size-[18px]" aria-hidden />
      {page ? (
        <>
          ކުރިއަށް ގެންދަވާ — <span className="font-arabic tabular-nums">{page}</span> ޞަފުޙާ
        </>
      ) : (
        label
      )}
    </Link>
  );
}
