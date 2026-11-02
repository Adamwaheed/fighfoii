"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LanguagesIcon,
  Loader2Icon,
  PlusIcon,
  RotateCcwIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  addChapter,
  deleteChapter,
  translateChapter,
  translateChapters,
  updateChapter,
} from "@/lib/book-actions";
import { NoThaana, ThaanaInput } from "./thaana-input";

export interface ManagedChapter {
  id: number;
  title: string;
  titleDv: string;
  startPage: number;
  endPage: number;
  level: number;
  pages: number;
  /** Translated pages inside the chapter, so gaps are visible at a glance. */
  readablePages: number;
}

/**
 * Chapter management for one book: titles in both languages, where each chapter
 * starts, and how much of it is translated.
 *
 * Edits are per row and save on demand rather than on every keystroke — a start
 * page is meaningless half-typed, and re-sorting the table under the cursor
 * while someone is still typing makes it unusable.
 */
export function ChapterManager({
  bookId,
  bookTitle,
  pageCount,
  chapters,
}: {
  bookId: number;
  bookTitle: string;
  pageCount: number;
  chapters: ManagedChapter[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const [bulk, startBulk] = useTransition();

  const untranslated = chapters.filter((c) => !c.titleDv.trim()).length;

  const run = (id: number, fn: () => Promise<{ error: string | null }>, ok: string) => {
    setBusyId(id);
    start(async () => {
      const res = await fn();
      setBusyId(null);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success(ok);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/admin/books/${bookId}`}>← {bookTitle}</Link>
        </Button>

        <span className="text-muted-ink text-[13px]">
          <span className="font-arabic tabular-nums">{chapters.length}</span> ބާބު
        </span>

        {untranslated > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="ms-auto"
            disabled={bulk}
            onClick={() =>
              startBulk(async () => {
                const res = await translateChapters(bookId);
                if (res.error) {
                  toast.error(res.error);
                  return;
                }
                toast.success(`${res.translated} ސުރުޚީ ތަރުޖަމާކުރެވިއްޖެ`);
                router.refresh();
              })
            }
          >
            {bulk ? <Loader2Icon className="animate-spin" /> : <LanguagesIcon />}
            ބާކީ ހުރި {untranslated} ސުރުޚީ ތަރުޖަމާކުރައްވާ
          </Button>
        )}
      </div>

      <div className="border-rule overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[34%]">އަޞްލު ސުރުޚީ</TableHead>
              <TableHead className="w-[34%]">ދިވެހި ސުރުޚީ</TableHead>
              <TableHead className="w-20">ފެށޭ</TableHead>
              <TableHead className="w-24">ޞަފުޙާ</TableHead>
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>

          <TableBody>
            {chapters.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-faint-ink py-10 text-center">
                  އަދި ބާބެއް ނެތެވެ
                </TableCell>
              </TableRow>
            )}

            {chapters.map((c) => (
              <ChapterRow
                // The key carries the server values, so a chapter that changes
                // underneath us — a retranslation, a save — remounts with fresh
                // state. Local typing does not alter props, so the row is never
                // reset out from under the cursor.
                key={`${c.id}:${c.title}:${c.titleDv}:${c.startPage}:${c.level}`}
                chapter={c}
                pageCount={pageCount}
                busy={pending && busyId === c.id}
                onSave={(title, titleDv, startPage, level) =>
                  run(
                    c.id,
                    () => updateChapter(c.id, title, startPage, level, titleDv),
                    "ރައްކާކުރެވިއްޖެ"
                  )
                }
                onTranslate={() =>
                  run(c.id, () => translateChapter(c.id), "ތަރުޖަމާކުރެވިއްޖެ")
                }
                onDelete={() =>
                  run(c.id, async () => deleteChapter(c.id), "ފުއްސަވައިފި")
                }
              />
            ))}
          </TableBody>
        </Table>
      </div>

      <AddChapter bookId={bookId} pageCount={pageCount} onDone={() => router.refresh()} />
    </div>
  );
}

function ChapterRow({
  chapter,
  pageCount,
  busy,
  onSave,
  onTranslate,
  onDelete,
}: {
  chapter: ManagedChapter;
  pageCount: number;
  busy: boolean;
  onSave: (title: string, titleDv: string, startPage: number, level: number) => void;
  onTranslate: () => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(chapter.title);
  const [titleDv, setTitleDv] = useState(chapter.titleDv);
  const [startPage, setStartPage] = useState(chapter.startPage);
  const [level, setLevel] = useState(chapter.level);

  const dirty =
    title !== chapter.title ||
    titleDv !== chapter.titleDv ||
    startPage !== chapter.startPage ||
    level !== chapter.level;

  return (
    <TableRow>
      <TableCell style={{ paddingInlineStart: `${(level - 1) * 14 + 12}px` }}>
        {/* Arabic source: the phonetic keyboard must not intercept here. */}
        <NoThaana>
          <Input
            dir="rtl"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="font-arabic h-8"
          />
        </NoThaana>
      </TableCell>

      <TableCell>
        <ThaanaInput
          value={titleDv}
          onValueChange={setTitleDv}
          placeholder="ތަރުޖަމާ…"
          className="h-8"
        />
      </TableCell>

      <TableCell>
        <Input
          type="number"
          dir="ltr"
          min={1}
          max={pageCount}
          value={startPage}
          onChange={(e) => setStartPage(Number(e.target.value) || 1)}
          className="h-8 w-16 text-start"
        />
      </TableCell>

      <TableCell className="text-muted-ink font-arabic text-[12.5px] tabular-nums">
        {chapter.startPage}–{chapter.endPage}
        <span className="text-faint-ink block">
          {chapter.readablePages}/{chapter.pages} ތަރުޖަމާ
        </span>
      </TableCell>

      <TableCell>
        <div className="flex items-center justify-end gap-0.5">
          <select
            value={level}
            onChange={(e) => setLevel(Number(e.target.value))}
            aria-label="ދަރަޖަ"
            className="border-rule text-muted-ink h-8 rounded-sm border bg-transparent px-1 text-[12px]"
          >
            {[1, 2, 3, 4].map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>

          {dirty ? (
            <Button
              size="sm"
              className="h-8"
              disabled={busy || !title.trim()}
              onClick={() => onSave(title, titleDv, startPage, level)}
            >
              {busy ? <Loader2Icon className="animate-spin" /> : "ރައްކާ"}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              disabled={busy}
              onClick={onTranslate}
              title={chapter.titleDv ? "އަލުން ތަރުޖަމާކުރައްވާ" : "ތަރުޖަމާކުރައްވާ"}
            >
              {busy ? (
                <Loader2Icon className="animate-spin" />
              ) : chapter.titleDv ? (
                <RotateCcwIcon className="size-3.5" />
              ) : (
                <LanguagesIcon className="size-3.5" />
              )}
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="text-muted-ink hover:text-destructive size-8"
            disabled={busy}
            onClick={onDelete}
            title="ފުއްސަވާ"
          >
            <Trash2Icon className="size-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function AddChapter({
  bookId,
  pageCount,
  onDone,
}: {
  bookId: number;
  pageCount: number;
  onDone: () => void;
}) {
  const [title, setTitle] = useState("");
  const [startPage, setStartPage] = useState(1);
  const [pending, start] = useTransition();

  const submit = () =>
    start(async () => {
      const res = await addChapter(bookId, title, startPage, 1);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success("ބާބު އިތުރުކުރެވިއްޖެ");
      setTitle("");
      onDone();
    });

  return (
    <div className="border-rule grid gap-2.5 rounded-md border p-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
      <div className="grid gap-1">
        <Label className="text-muted-ink text-[12px]">އައު ބާބެއް</Label>
        <NoThaana>
          <Input
            dir="rtl"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="ބާބުގެ ސުރުޚީ…"
          />
        </NoThaana>
      </div>

      <div className="grid gap-1">
        <Label className="text-muted-ink text-[12px]">ފެށޭ ޞަފުޙާ</Label>
        <Input
          type="number"
          dir="ltr"
          min={1}
          max={pageCount}
          value={startPage}
          onChange={(e) => setStartPage(Number(e.target.value) || 1)}
          className="w-24 text-start"
        />
      </div>

      <Button onClick={submit} disabled={pending || !title.trim()}>
        {pending ? <Loader2Icon className="animate-spin" /> : <PlusIcon />}
        އިތުރުކުރައްވާ
      </Button>
    </div>
  );
}
