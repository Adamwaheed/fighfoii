"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Highlighter,
  StickyNote,
  Trash2,
  X,
  BookOpen,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  HIGHLIGHT_COLORS,
  type HighlightColor,
  type Mark,
  addMark,
  getBookState,
  newId,
  removeMark,
  saveProgress,
  subscribe,
  updateMark,
} from "@/lib/reader-store";
import { rangeFromOffsets, selectionSegments, supportsHighlightApi } from "@/lib/reader-ranges";

/** Paint styles live in globals.css as ::highlight(...) rules. */
const HIGHLIGHT_NAME: Record<HighlightColor, string> = {
  yellow: "fq-mark-yellow",
  blue: "fq-mark-blue",
  green: "fq-mark-green",
  pink: "fq-mark-pink",
};

const COLOR_SWATCH: Record<HighlightColor, string> = {
  yellow: "bg-[#FBE9A0]",
  blue: "bg-[#BFE4F8]",
  green: "bg-[#BCE8C8]",
  pink: "bg-[#F8C9DC]",
};

/** Built outside the component: `Date.now()` must not run during render. */
function buildMark(
  page: number,
  color: HighlightColor,
  seg: { blockId: number; start: number; end: number; text: string }
): Mark {
  return {
    id: newId(),
    page,
    blockId: seg.blockId,
    start: seg.start,
    end: seg.end,
    text: seg.text,
    color,
    note: "",
    createdAt: Date.now(),
  };
}

interface Props {
  slug: string;
  pageNo: number;
  prevPage: number | null;
  nextPage: number | null;
  index: number;
  total: number;
  children: React.ReactNode;
}

export function ReaderShell({
  slug,
  pageNo,
  prevPage,
  nextPage,
  index,
  total,
  children,
}: Props) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [notesOpen, setNotesOpen] = useState(false);
  const [pending, setPending] = useState<{ x: number; y: number } | null>(null);
  const [editing, setEditing] = useState<Mark | null>(null);

  // Load marks and follow changes from this tab or another one.
  useEffect(() => {
    const sync = () => setMarks(getBookState(slug).marks);
    sync();
    return subscribe(sync);
  }, [slug]);

  // Remember the page as soon as it is opened, so "continue" is always current.
  useEffect(() => {
    saveProgress(slug, pageNo);
  }, [slug, pageNo]);

  const pageMarks = useMemo(
    () => marks.filter((m) => m.page === pageNo),
    [marks, pageNo]
  );

  /**
   * Repaints every highlight on the page. The Custom Highlight API takes ranges
   * directly, so nothing is inserted into the DOM and React stays the only
   * writer of this subtree.
   */
  const paint = useCallback(() => {
    if (!supportsHighlightApi() || !bodyRef.current) return;

    for (const name of Object.values(HIGHLIGHT_NAME)) CSS.highlights.delete(name);

    const byColor = new Map<HighlightColor, Range[]>();
    for (const m of pageMarks) {
      const block = bodyRef.current.querySelector<HTMLElement>(
        `[data-block-id="${m.blockId}"]`
      );
      if (!block) continue;
      const range = rangeFromOffsets(block, m.start, m.end);
      if (!range) continue;
      const list = byColor.get(m.color) ?? [];
      list.push(range);
      byColor.set(m.color, list);
    }

    for (const [color, ranges] of byColor) {
      CSS.highlights.set(HIGHLIGHT_NAME[color], new Highlight(...ranges));
    }
  }, [pageMarks]);

  useEffect(() => {
    paint();
    return () => {
      if (supportsHighlightApi()) {
        for (const name of Object.values(HIGHLIGHT_NAME)) CSS.highlights.delete(name);
      }
    };
  }, [paint]);

  // Offer the toolbar wherever the selection ends.
  const onSelect = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !bodyRef.current) {
      setPending(null);
      return;
    }
    if (!bodyRef.current.contains(sel.anchorNode)) return;

    const rect = sel.getRangeAt(0).getBoundingClientRect();
    if (!rect.width && !rect.height) return;
    setPending({ x: rect.left + rect.width / 2, y: rect.top });
  }, []);

  const commit = (color: HighlightColor, withNote: boolean) => {
    if (!bodyRef.current) return;
    const segments = selectionSegments(bodyRef.current);
    if (!segments.length) return;

    let last: Mark | null = null;
    for (const seg of segments) {
      const mark = buildMark(pageNo, color, seg);
      addMark(slug, mark);
      last = mark;
    }

    window.getSelection()?.removeAllRanges();
    setPending(null);
    if (withNote && last) {
      setEditing(last);
      setNotesOpen(true);
    }
  };

  return (
    <div className="relative" onMouseUp={onSelect} onTouchEnd={onSelect}>
      <div ref={bodyRef}>{children}</div>

      {/* Selection toolbar */}
      {pending && (
        <div
          className="border-rule bg-paper-4 fixed z-40 flex -translate-x-1/2 -translate-y-[calc(100%+10px)] items-center gap-1 rounded-[6px] border p-1 shadow-[0_8px_24px_rgba(11,26,61,0.18)] rtl:translate-x-1/2"
          style={{ left: pending.x, top: pending.y }}
        >
          {HIGHLIGHT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => commit(c, false)}
              aria-label={`ފާހަގަ ${c}`}
              className={`size-7 rounded-[4px] border border-black/10 transition-transform hover:scale-110 ${COLOR_SWATCH[c]}`}
            />
          ))}
          <span className="bg-rule mx-0.5 h-6 w-px" />
          <button
            type="button"
            onClick={() => commit("yellow", true)}
            aria-label="ނޯޓެއް ލިޔުއްވާ"
            className="text-muted-ink hover:bg-paper-2 hover:text-ink inline-flex size-7 items-center justify-center rounded-[4px] transition-colors"
          >
            <StickyNote className="size-4" aria-hidden />
          </button>
        </div>
      )}

      {/* Page navigation */}
      <nav className="border-rule mt-10 flex items-center justify-between gap-3 border-t pt-5">
        <NavLink slug={slug} page={prevPage} dir="prev" />
        <div className="text-faint-ink text-center text-[13px] leading-[1.8]">
          <div className="font-arabic tabular-nums">
            {index} / {total}
          </div>
          <div className="bg-rule-soft mt-1.5 h-1 w-28 overflow-hidden rounded-full">
            <div
              className="bg-brand-accent h-full rounded-full transition-[width] duration-300"
              style={{ width: `${total ? (index / total) * 100 : 0}%` }}
            />
          </div>
        </div>
        <NavLink slug={slug} page={nextPage} dir="next" />
      </nav>

      {/* Notes launcher */}
      <button
        type="button"
        onClick={() => setNotesOpen(true)}
        className="border-rule bg-paper-4 text-brand-deep hover:border-rule-strong fixed bottom-6 start-6 z-30 inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-[14px] leading-[1.7] shadow-[0_6px_18px_rgba(11,26,61,0.12)] transition-colors"
      >
        <Highlighter className="size-[18px]" aria-hidden />
        <span className="font-arabic tabular-nums">{marks.length}</span>
      </button>

      {notesOpen && (
        <NotesPanel
          slug={slug}
          marks={marks}
          pageNo={pageNo}
          editing={editing}
          onEdit={setEditing}
          onClose={() => {
            setNotesOpen(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function NavLink({
  slug,
  page,
  dir,
}: {
  slug: string;
  page: number | null;
  dir: "prev" | "next";
}) {
  const label = dir === "prev" ? "ކުރީގެ" : "ދެން";
  // RTL: "previous" sits on the right, so the chevron points that way.
  const Icon = dir === "prev" ? ChevronRight : ChevronLeft;

  if (!page) {
    return <span className="text-faint-ink/50 min-h-11 px-4 py-2 text-[14px]">{label}</span>;
  }
  return (
    <Link
      href={`/library/${slug}/read?page=${page}`}
      className="border-rule text-brand-deep hover:border-rule-strong hover:bg-paper-2 inline-flex min-h-11 items-center gap-1.5 rounded-[4px] border px-4 text-[14.5px] leading-[1.7] transition-colors"
    >
      <Icon className="size-4" aria-hidden />
      {label}
    </Link>
  );
}

/**
 * Notes save on every keystroke rather than on blur: the panel can be dismissed
 * without the field ever losing focus first, and a note lost that way would be
 * invisible to the reader until they went looking for it.
 */
function NoteEditor({
  slug,
  mark,
  onDone,
}: {
  slug: string;
  mark: Mark;
  onDone: () => void;
}) {
  const [text, setText] = useState(mark.note);

  return (
    <textarea
      autoFocus
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        updateMark(slug, mark.id, { note: e.target.value });
      }}
      onBlur={onDone}
      placeholder="ނޯޓު…"
      dir="rtl"
      className="border-rule focus:border-brand text-ink w-full rounded-[4px] border bg-transparent p-2 text-[14px] leading-[1.9] outline-none"
      rows={3}
    />
  );
}

function NotesPanel({
  slug,
  marks,
  pageNo,
  editing,
  onEdit,
  onClose,
}: {
  slug: string;
  marks: Mark[];
  pageNo: number;
  editing: Mark | null;
  onEdit: (m: Mark | null) => void;
  onClose: () => void;
}) {
  const ordered = useMemo(
    () => [...marks].sort((a, b) => a.page - b.page || a.createdAt - b.createdAt),
    [marks]
  );

  return (
    <>
      <button
        type="button"
        aria-label="ބަންދުކުރައްވާ"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/25"
      />
      <aside className="bg-paper border-rule fixed inset-y-0 end-0 z-50 flex w-[88%] max-w-[380px] flex-col border-s shadow-[0_0_40px_rgba(11,26,61,0.18)]">
        <header className="border-rule-soft flex items-center justify-between border-b px-4 py-3.5">
          <h2 className="font-heading text-heading-ink text-[19px] leading-[1.6]">
            ފާހަގަތަކާއި ނޯޓު
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="ބަންދުކުރައްވާ"
            className="text-muted-ink hover:bg-paper-2 hover:text-ink inline-flex size-9 items-center justify-center rounded-[4px] transition-colors"
          >
            <X className="size-5" aria-hidden />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {!ordered.length ? (
            <p className="text-faint-ink py-12 text-center text-[14.5px] leading-[2]">
              ލިޔުމުން ބައެއް ޚިޔާރުކުރައްވައި ފާހަގަ ޖައްސަވާ
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {ordered.map((m) => (
                <li
                  key={m.id}
                  className={`border-rule-soft bg-paper-4 rounded-[6px] border p-3 ${
                    m.page === pageNo ? "" : "opacity-80"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span
                      className={`size-3 rounded-full border border-black/10 ${COLOR_SWATCH[m.color]}`}
                      aria-hidden
                    />
                    <Link
                      href={`/library/${slug}/read?page=${m.page}`}
                      className="text-faint-ink hover:text-brand text-[12px] leading-[1.8] transition-colors"
                    >
                      <span className="font-arabic tabular-nums">{m.page}</span> ޞަފުޙާ
                    </Link>
                    <button
                      type="button"
                      onClick={() => removeMark(slug, m.id)}
                      aria-label="ފުއްސަވާ"
                      className="text-faint-ink hover:text-ink ms-auto inline-flex size-7 items-center justify-center rounded-[4px] transition-colors"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </div>

                  <blockquote className="text-article-ink border-brand-accent/40 mb-2 border-s-2 ps-2.5 text-[14.5px] leading-[2]">
                    {m.text}
                  </blockquote>

                  {editing?.id === m.id ? (
                    <NoteEditor slug={slug} mark={m} onDone={() => onEdit(null)} />
                  ) : (
                    <button
                      type="button"
                      onClick={() => onEdit(m)}
                      className="text-muted-ink hover:text-brand w-full text-start text-[14px] leading-[1.9] transition-colors"
                    >
                      {m.note || <span className="text-faint-ink">ނޯޓެއް އިތުރުކުރައްވާ…</span>}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="border-rule-soft border-t px-4 py-3">
          <Link
            href={`/library/${slug}`}
            className="text-muted-ink hover:text-brand inline-flex items-center gap-2 text-[14px] leading-[1.8] transition-colors"
          >
            <BookOpen className="size-4" aria-hidden />
            ފޮތުގެ ޞަފުޙާ
          </Link>
        </footer>
      </aside>
    </>
  );
}
