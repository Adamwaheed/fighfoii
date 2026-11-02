"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { BlockEditor, type DraftBlock } from "./block-editor";
import { PdfPageView } from "@/components/pdf-page-view";
import { HeaderPortal } from "./header-portal";
import { BookPublish } from "./book-publish";
import { ApprovalControl } from "./approval-control";
import { AddPagesControl } from "./add-pages-control";
import { ChapterPanel } from "./chapter-panel";
import { ThaanaToggle } from "./thaana-input";
import { PageEditor } from "./page-editor";
import { SourceTextView } from "./source-text-view";
import { savePageBlocks, saveSourceText, setPageStatus } from "@/lib/book-actions";
import type { Book, BookPage, Chapter } from "@/lib/books";
import type { BlockType } from "@/lib/types";

/** A page_blocks row as returned by the translate endpoint. */
interface ServerBlock {
  id: number;
  type: BlockType;
  main: string;
  sub: string;
  ref: string;
  level: number;
  image: string;
  style: string;
}
import {
  BookOpenIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FileTextIcon,
  LanguagesIcon,
  LayoutListIcon,
  LoaderCircleIcon,
  BookIcon,
  SettingsIcon,
  Columns2Icon,
  SquareIcon,
  LayersIcon,
  ListTreeIcon,
  SaveIcon,
  ScanTextIcon,
  TriangleAlertIcon,
} from "lucide-react";

export function BookTranslator({
  book,
  pages,
  chapters,
  page,
  initialBlocks,
  hasKey,
}: {
  book: Book;
  pages: BookPage[];
  chapters: (Chapter & { endPage: number; pages: number })[];
  page: BookPage;
  initialBlocks: DraftBlock[];
  hasKey: boolean;
}) {
  const router = useRouter();
  const [blocks, setBlocks] = useState<DraftBlock[]>(initialBlocks);
  const [source, setSource] = useState(page.sourceText);
  const [translating, setTranslating] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [bulk, setBulk] = useState<{ done: number; total: number } | null>(null);
  const abortBulk = useRef(false);
  // Opens in page mode, matching the article editor: the translation reads
  // as it will publish, and stays editable in place.
  const [mode, setMode] = useState<"blocks" | "page">("page");
  const [elapsed, setElapsed] = useState(0);
  const [sourceOpen, setSourceOpen] = useState(false);
  // How many source pages face the translation: one, or a two-page spread.
  const [spread, setSpread] = useState<1 | 2>(1);
  // Either the source faces the translation, or the translation has the width
  // to itself.
  const [layout, setLayout] = useState<"split" | "solo">("split");
  const startedAt = useRef(0);

  // A page can take half a minute; showing the clock is the difference between
  // "working" and "broken" from the outside.
  const busy = translating || extracting || bulk !== null;

  useEffect(() => {
    if (!busy) return;
    // startedAt is stamped where the request begins, so the effect only ticks.
    const id = setInterval(
      () => setElapsed(Math.round((Date.now() - startedAt.current) / 1000)),
      1000
    );
    return () => clearInterval(id);
  }, [busy]);
  const [pending, start] = useTransition();

  const go = (n: number) => {
    if (n < 1 || n > book.pageCount) return;
    router.push(`/admin/books/${book.id}?page=${n}`);
  };

  const save = () =>
    start(async () => {
      await savePageBlocks(
        page.id,
        blocks.map(({ type, main, sub, ref, level, image, style }) => ({
          type,
          main,
          sub,
          ref,
          level,
          image,
          style,
        }))
      );
      await saveSourceText(page.id, source);
      toast.success("ރައްކާކުރެވިއްޖެ");
    });

  /** Transcribe this page's Arabic without translating it. */
  async function extract() {
    startedAt.current = Date.now();
    setElapsed(0);
    setExtracting(true);
    try {
      const res = await fetch(`/api/books/${book.id}/extract`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pageNo: page.pageNo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "extract failed");

      if (!data.chars) {
        toast.warning("މި ޞަފުޙާއިން ލިޔުމެއް ނުފެނުނު");
      } else {
        setSource(data.arabic);
        setSourceOpen(true);
        toast.success(`${data.chars} އަކުރު ނެގިއްޖެ`);
      }
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ލިޔުން ނުނެގުނު");
    } finally {
      setExtracting(false);
    }
  }

  /**
   * Extract every page that has no text yet, one request per page.
   *
   * Sequential on purpose: each page stays a separate call, so progress is
   * real, a failure costs one page rather than the batch, and it can be
   * stopped part-way. Pages that already have text are skipped so a re-run
   * never overwrites work.
   */
  async function extractAll() {
    const todo = pages.filter((p) => !p.sourceText.trim());
    if (todo.length === 0) {
      toast.info("ހުރިހާ ޞަފުޙާއެއްގައި ލިޔުން އެބަހުއްޓެވެ");
      return;
    }

    abortBulk.current = false;
    setBulk({ done: 0, total: todo.length });

    let ok = 0;
    let failed = 0;

    for (const [i, p] of todo.entries()) {
      if (abortBulk.current) break;
      try {
        const res = await fetch(`/api/books/${book.id}/extract`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ pageNo: p.pageNo }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "failed");
        if (data.chars) ok += 1;
        // The page being viewed should show its new text straight away.
        if (p.pageNo === page.pageNo && data.arabic) setSource(data.arabic);
      } catch {
        failed += 1;
      }
      setBulk({ done: i + 1, total: todo.length });
    }

    const stopped = abortBulk.current;
    setBulk(null);
    router.refresh();

    if (stopped) toast.info(`ހުއްޓާލެވިއްޖެ — ${ok} ޞަފުޙާ ނެގުނު`);
    else if (failed) toast.warning(`${ok} ޞަފުޙާ ނެގުނު، ${failed} ނާކާމިޔާބު`);
    else toast.success(`${ok} ޞަފުޙާގެ ލިޔުން ނެގިއްޖެ`);
  }

  async function translate() {
    startedAt.current = Date.now();
    setElapsed(0);
    setTranslating(true);
    try {
      const res = await fetch(`/api/books/${book.id}/translate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pageNo: page.pageNo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "translate failed");

      if (data.empty) {
        toast.warning("މި ޞަފުޙާއިން ލިޔުމެއް ނުފެނުނު — ހުސް ޞަފުޙާއެއް ކަމަށްވެދާނެ");
      } else {
        // Apply what the server saved. State is not derived from props, so a
        // refresh on its own would leave the form showing the old contents.
        setBlocks(
          (data.blocks as ServerBlock[]).map((b) => ({
            key: `b${b.id}`,
            type: b.type,
            main: b.main ?? "",
            sub: b.sub ?? "",
            ref: b.ref ?? "",
            level: b.level ?? 1,
            image: b.image ?? "",
            style: b.style ?? "",
          }))
        );
        setSource(data.arabic ?? "");
        toast.success(`${data.count} ބްލޮކް ތަރުޖަމާވެއްޖެ`);
      }

      // Refresh the status badge and page rail; the blocks are already applied.
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ތަރުޖަމާ ނުކުރެވުނު");
    } finally {
      setTranslating(false);
    }
  }

  const done = pages.filter((p) => p.status === "translated").length;
  const approved = pages.filter((p) => p.approval === "approved").length;
  const pendingExtract = pages.filter((p) => !p.sourceText.trim()).length;
  // The page shown beside the current one in a spread.
  const facingPage = pages.find((p) => p.pageNo === page.pageNo + 1) ?? null;
  const currentChapter =
    [...chapters].reverse().find((c) => c.startPage <= page.pageNo) ?? null;

  return (
    <div className="flex flex-col gap-3">
      {/* The toolbar renders into the admin header bar; it stays part of this
          component, so all of its state and handlers work unchanged. */}
      <HeaderPortal>
        <div className="flex min-w-0 items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="flex-none">
            <Link href="/admin/books">← ފޮތްތައް</Link>
          </Button>
          <span className="font-heading text-heading-ink hidden max-w-52 truncate text-[16px] lg:block">
            {book.title}
          </span>
          <Badge variant="secondary" className="hidden flex-none md:inline-flex">
            {done}/{book.pageCount} · ✓{approved}
          </Badge>
          <BookPublish
            id={book.id}
            slug={book.slug}
            published={book.published}
            readablePages={done}
          />
          <Button asChild variant="outline" size="icon" className="flex-none" title="ޝާއިޢުކުރުމުގެ ވިޒާޑް">
            <Link href={`/admin/books/${book.id}/publish`}>
              <SettingsIcon />
            </Link>
          </Button>
        </div>

        <div className="ms-auto flex flex-none items-center gap-2">
          <div className="border-rule flex flex-none items-center gap-1 rounded-sm border px-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="ކުރީ ޞަފުޙާ"
              onClick={() => go(page.pageNo - 1)}
              disabled={page.pageNo <= 1}
            >
              <ChevronRightIcon />
            </Button>
            <span className="font-arabic min-w-16 text-center text-[14px] tabular-nums">
              {page.pageNo} / {book.pageCount}
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="ފަހު ޞަފުޙާ"
              onClick={() => go(page.pageNo + 1)}
              disabled={page.pageNo >= book.pageCount}
            >
              <ChevronLeftIcon />
            </Button>
          </div>

          <Button
            variant="outline"
            size="icon"
            className="flex-none"
            onClick={() => setLayout((v) => (v === "split" ? "solo" : "split"))}
            aria-pressed={layout === "split"}
            title={layout === "split" ? "ތަރުޖަމާ އެކަނި" : "ދެ ފަރާތުގައި"}
          >
            {layout === "split" ? <Columns2Icon /> : <SquareIcon />}
          </Button>

          {/* Facing pages only make sense for a scan shown beside the work. */}
          {layout === "split" && book.sourceType === "pdf" && (
            <Button
              variant="outline"
              size="icon"
              className="flex-none"
              onClick={() => setSpread((v) => (v === 1 ? 2 : 1))}
              aria-pressed={spread === 2}
              title={spread === 2 ? "އެއް ޞަފުޙާ" : "ދެ ޞަފުޙާ"}
            >
              {spread === 2 ? <BookOpenIcon /> : <BookIcon />}
            </Button>
          )}

          {/* One control, two states: the page as it reads, or its blocks. */}
          <Button
            variant="outline"
            size="icon"
            className="flex-none"
            onClick={() => setMode((v) => (v === "page" ? "blocks" : "page"))}
            aria-pressed={mode === "blocks"}
            title={mode === "page" ? "ބްލޮކް" : "ޞަފުޙާގައި"}
          >
            {mode === "page" ? <FileTextIcon /> : <LayoutListIcon />}
          </Button>

          {book.sourceType === "pdf" && (
            <Button
              variant="outline"
              size="sm"
              className="flex-none"
              onClick={extract}
              disabled={busy || !hasKey}
              title={hasKey ? "ތަރުޖަމާ ނުކޮށް ޢަރަބި މަތުނު ނަގާ" : "GEMINI_API_KEY ބޭނުންވޭ"}
            >
              {extracting ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : (
                <ScanTextIcon />
              )}
              {extracting ? (
                <span className="font-arabic tabular-nums">{elapsed}s</span>
              ) : (
                "ލިޔުން ނަގާ"
              )}
            </Button>
          )}

          {book.sourceType === "pdf" &&
            (bulk ? (
              <Button
                variant="secondary"
                size="sm"
                className="flex-none"
                onClick={() => {
                  abortBulk.current = true;
                }}
              >
                <LoaderCircleIcon className="animate-spin" />
                <span className="font-arabic tabular-nums">
                  {bulk.done}/{bulk.total}
                </span>
                ހުއްޓާލާ
              </Button>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-none"
                    disabled={busy || !hasKey}
                    title="ލިޔުން ނެތް ހުރިހާ ޞަފުޙާއެއްގެ މަތުނު ނަގާ"
                  >
                    <LayersIcon />
                    ހުރިހާ ޞަފުޙާ
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-heading">
                      ހުރިހާ ޞަފުޙާއެއްގެ ލިޔުން ނަގަންތޯ؟
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      ލިޔުން ނެތް {pendingExtract} ޞަފުޙާގެ މަތުނު ވަކިވަކިން ނެގޭނެއެވެ.
                      ކުރިންވެސް ލިޔުން ހުރި ޞަފުޙާތައް ދޫކޮށްލެވޭނެއެވެ. ކޮންމެ ވަގުތެއްގައިވެސް
                      ހުއްޓާލެވޭނެއެވެ.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>ބާޠިލު</AlertDialogCancel>
                    <AlertDialogAction onClick={extractAll}>ފައްޓަވާ</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ))}

          <Button
            size={translating ? "sm" : "icon"}
            className="flex-none"
            onClick={translate}
            disabled={busy || !hasKey}
            aria-label="ތަރުޖަމާކުރައްވާ"
            title={hasKey ? "ތަރުޖަމާކުރައްވާ" : "GEMINI_API_KEY ބޭނުންވޭ"}
          >
            {translating ? <LoaderCircleIcon className="animate-spin" /> : <LanguagesIcon />}
            {/* The elapsed count is progress, not a label — it stays. */}
            {translating && <span className="font-arabic tabular-nums">{elapsed}s</span>}
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="flex-none"
            onClick={save}
            disabled={pending || busy}
            aria-label="ރައްކާކުރައްވާ"
            title="ރައްކާކުރައްވާ"
          >
            <SaveIcon />
          </Button>

          <Button
            variant={page.status === "translated" ? "secondary" : "outline"}
            size="sm"
            className="flex-none"
            onClick={() =>
              start(async () => {
                await setPageStatus(
                  page.id,
                  page.status === "translated" ? "pending" : "translated"
                );
                router.refresh();
              })
            }
            disabled={pending}
          >
            {page.status === "translated" ? "ނުނިމޭ ކަމަށް" : "ނިމުނު ކަމަށް"}
          </Button>

          <ThaanaToggle />

          <ChapterPanel
            bookId={book.id}
            chapters={chapters}
            pageCount={book.pageCount}
            currentPage={page.pageNo}
            onJump={go}
          />

          <ApprovalControl
            pageId={page.id}
            approval={page.approval}
            note={page.approvalNote}
            disabled={page.status !== "translated"}
          />
        </div>
      </HeaderPortal>

      {currentChapter && (
        <div className="text-muted-ink flex items-center gap-2 text-[12.5px]">
          <ListTreeIcon className="text-brand size-3.5 flex-none" />
          <span className="truncate">{currentChapter.title}</span>
          <span className="font-arabic text-faint-ink flex-none tabular-nums">
            {currentChapter.startPage}–{currentChapter.endPage}
          </span>
        </div>
      )}

      {/* Page rail */}
      <div className="no-scrollbar flex gap-1 overflow-x-auto pb-1">
        {pages.map((p) => (
          <button
            key={p.id}
            data-chapter-start={chapters.some((c) => c.startPage === p.pageNo) || undefined}
            type="button"
            onClick={() => go(p.pageNo)}
            title={`ޞަފުޙާ ${p.pageNo}`}
            className={`font-arabic h-7 min-w-7 flex-none rounded-sm border px-1.5 text-[12px] tabular-nums transition-colors data-[chapter-start]:ms-2 data-[chapter-start]:shadow-[inset_2px_0_0_0_var(--brand)] ${
              p.pageNo === page.pageNo
                ? "border-brand bg-brand text-paper"
                : p.approval === "approved"
                  ? "border-brand bg-brand/20 text-brand"
                  : p.approval === "rejected"
                    ? "border-[#C68B7B] bg-[#F7E9E5] text-[#A8402A]"
                    : p.status === "translated"
                      ? "border-brand/40 bg-brand/5 text-brand"
                      : "border-rule text-muted-ink hover:border-brand"
            }`}
          >
            {p.pageNo}
          </button>
        ))}

        <AddPagesControl bookId={book.id} onAdded={(n) => go(n)} />
      </div>

      {/* Side by side. In RTL the first child sits on the right, so the source
          page faces the reader's start edge and the translation sits beside it. */}
      <div
        className={`grid gap-3 ${
          layout === "solo"
            ? "grid-cols-1"
            : spread === 2
              ? "xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]"
              : "xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
        }`}
      >
        {layout === "split" && (
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {book.sourceType === "text" ? (
                <SourceTextView
                  value={source}
                  onChange={setSource}
                  pageNo={page.pageNo}
                  scanning={busy}
                  elapsed={elapsed}
                  className="h-[78svh] w-full"
                />
              ) : (
                <div
                  className={
                    spread === 2 ? "grid grid-cols-2 divide-x divide-[var(--rule)]" : ""
                  }
                >
                  {/* In a spread the facing page sits to the left of the current
                      one, the direction the book itself runs. */}
                  {spread === 2 && facingPage && (
                    <PdfPageView
                      url={book.pdfPath}
                      pageNo={facingPage.pageNo}
                      className="h-[78svh] w-full opacity-90"
                    />
                  )}
                  <PdfPageView
                    url={book.pdfPath}
                    pageNo={page.pageNo}
                    scanning={busy}
                    elapsed={elapsed}
                    className="h-[78svh] w-full"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div
          className={`flex flex-col gap-3 ${
            layout === "solo" ? "mx-auto w-full max-w-[1100px]" : ""
          }`}
        >
          {/* The source page is already visible alongside, so the extracted
              text stays folded away until it is actually needed for a fix. */}
          {book.sourceType === "pdf" && (
            <Collapsible open={sourceOpen} onOpenChange={setSourceOpen}>
              <Card>
                <CardContent className="grid gap-2">
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="text-muted-ink hover:text-brand -mx-1 flex items-center justify-between gap-2 rounded-sm px-1 py-0.5 text-[12.5px] transition-colors"
                    >
                      <span className="flex items-center gap-1.5">
                        <ChevronDownIcon
                          className={`size-3.5 transition-transform ${
                            sourceOpen ? "rotate-180" : ""
                          }`}
                        />
                        ޢަރަބި މަތުނު (PDF އިން)
                      </span>
                      <span className="flex items-center gap-2">
                        {page.translatedAt && (
                          <span className="text-brand-accent">ތަރުޖަމާކުރެވިފައި</span>
                        )}
                        <span className="font-arabic tabular-nums">
                          {source.trim() ? `${source.trim().length} އަކުރު` : "ހުސް"}
                        </span>
                      </span>
                    </button>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <Textarea
                      dir="rtl"
                      rows={8}
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      placeholder="ތަރުޖަމާކުރެއްވުމުން ޢަރަބި މަތުނު މިތަނުގައި ދައްކާނެއެވެ…"
                      className="font-arabic bg-paper-2 text-[19px] leading-[2]"
                    />
                  </CollapsibleContent>
                </CardContent>
              </Card>
            </Collapsible>
          )}

          {page.approval === "rejected" && page.approvalNote && (
            <div className="flex items-start gap-2 border border-[#E4C4BB] bg-[#FBF1EE] px-3 py-2.5 text-[13.5px] leading-[1.9] text-[#A8402A]">
              <TriangleAlertIcon className="mt-1 size-4 flex-none" />
              <span>{page.approvalNote}</span>
            </div>
          )}

          <Card>
            <CardContent className="max-h-[78svh] overflow-y-auto">
              <div className="text-muted-ink mb-2 text-[12.5px]">ދިވެހި ތަރުޖަމާ</div>
              {mode === "page" ? (
                <PageEditor blocks={blocks} onChange={setBlocks} />
              ) : (
                <BlockEditor blocks={blocks} onChange={setBlocks} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
