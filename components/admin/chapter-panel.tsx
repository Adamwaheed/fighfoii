"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NoThaana, ThaanaInput } from "./thaana-input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  addChapter,
  deleteChapter,
  translateChapters,
  updateChapter,
} from "@/lib/book-actions";
import type { Chapter } from "@/lib/books";
import Link from "next/link";
import {
  LanguagesIcon,
  ListTreeIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  SettingsIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";

interface Ranged extends Chapter {
  endPage: number;
  pages: number;
}

/** Chapter list, editor, and jump-to navigation for one book. */
export function ChapterPanel({
  bookId,
  chapters,
  pageCount,
  currentPage,
  onJump,
}: {
  bookId: number;
  chapters: Ranged[];
  pageCount: number;
  currentPage: number;
  onJump: (pageNo: number) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [titleDv, setTitleDv] = useState("");
  const [startPage, setStartPage] = useState(currentPage);
  const [level, setLevel] = useState(1);
  const [pending, start] = useTransition();
  const [translating, startTranslate] = useTransition();

  const untranslated = chapters.filter((c) => !c.titleDv.trim()).length;

  const translateAll = () =>
    startTranslate(async () => {
      const res = await translateChapters(bookId);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(`${res.translated} ބާބުގެ ސުރުޚީ ތަރުޖަމާކުރެވިއްޖެ`);
      router.refresh();
    });

  const reset = () => {
    setEditing(null);
    setTitle("");
    setTitleDv("");
    setStartPage(currentPage);
    setLevel(1);
  };

  const submit = () =>
    start(async () => {
      const res = editing
        ? await updateChapter(editing, title, startPage, level, titleDv)
        : await addChapter(bookId, title, startPage, level);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success(editing ? "ބާބު އުނިއިތުރުކުރެވިއްޖެ" : "ބާބު އިތުރުކުރެވިއްޖެ");
      reset();
      router.refresh();
    });

  const beginEdit = (c: Ranged) => {
    setEditing(c.id);
    setTitle(c.title);
    setTitleDv(c.titleDv);
    setStartPage(c.startPage);
    setLevel(c.level);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="flex-none" title="ބާބުތައް">
          <ListTreeIcon />
          <span className="hidden lg:inline">ބާބުތައް</span>
          {chapters.length > 0 && (
            <span className="font-arabic tabular-nums opacity-70">{chapters.length}</span>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-[340px] gap-0 overflow-y-auto sm:max-w-none">
        <SheetHeader>
          <SheetTitle className="font-heading text-xl">ބާބުތައް</SheetTitle>
          <SheetDescription>
            ބާބު ފެށޭ ޞަފުޙާ ކަނޑައަޅުއްވާ. ޞަފުޙާތައް ބެހިގެންދާނީ އެއިން އަމިއްލައަށެވެ.
          </SheetDescription>
        </SheetHeader>

        <div className="grid gap-4 px-4 pb-6">
          <Button asChild variant="secondary" size="sm" className="justify-center">
            <Link href={`/admin/books/${bookId}/chapters`}>
              <SettingsIcon />
              ބާބުތައް ބެލެހެއްޓުން
            </Link>
          </Button>

          {untranslated > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={translateAll}
              disabled={translating}
              className="justify-center"
            >
              {translating ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <LanguagesIcon />
              )}
              ސުރުޚީތައް ތަރުޖަމާކުރައްވާ ({untranslated})
            </Button>
          )}

          {/* Existing chapters */}
          <div className="grid gap-1">
            {chapters.length === 0 && (
              <p className="text-faint-ink py-6 text-center text-[13.5px]">
                އަދި ބާބެއް ނެތެވެ.
              </p>
            )}

            {chapters.map((c) => {
              const active = currentPage >= c.startPage && currentPage <= c.endPage;
              return (
                <div
                  key={c.id}
                  className={`group flex items-start gap-1.5 rounded-sm border px-2 py-1.5 transition-colors ${
                    active ? "border-brand bg-brand/5" : "border-transparent hover:border-rule"
                  }`}
                  style={{ paddingInlineStart: `${(c.level - 1) * 12 + 8}px` }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onJump(c.startPage);
                      setOpen(false);
                    }}
                    className="min-w-0 flex-1 text-start"
                  >
                    <span className="text-heading-ink block truncate text-[14.5px] leading-[1.7]">
                      {c.titleDv || c.title}
                    </span>
                    {/* Keep the source visible once translated, so a wrong
                        rendering is obvious without opening the editor. */}
                    {c.titleDv && (
                      <span className="text-muted-ink font-arabic block truncate text-[12px] leading-[1.7]">
                        {c.title}
                      </span>
                    )}
                    <span className="text-faint-ink font-arabic block text-[11.5px] tabular-nums">
                      {c.startPage}–{c.endPage} · {c.pages} ޞަފުޙާ
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => beginEdit(c)}
                    aria-label="އުނިއިތުރު"
                    className="text-muted-ink hover:text-brand grid size-6 flex-none place-items-center rounded-sm opacity-0 transition group-hover:opacity-100"
                  >
                    <PencilIcon className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        await deleteChapter(c.id);
                        toast.success("ބާބު ފޮހެލެވިއްޖެ");
                        router.refresh();
                      })
                    }
                    aria-label="ފޮހެލާ"
                    className="text-faint-ink hover:text-destructive grid size-6 flex-none place-items-center rounded-sm opacity-0 transition group-hover:opacity-100"
                  >
                    <Trash2Icon className="size-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Add / edit */}
          <div className="border-rule grid gap-2.5 border-t pt-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-ink text-[13px]">
                {editing ? "ބާބު އުނިއިތުރުކުރައްވާ" : "އައު ބާބެއް"}
              </span>
              {editing && (
                <Button variant="ghost" size="sm" onClick={reset} className="h-7 px-2">
                  <XIcon className="size-3.5" />
                  ބާޠިލު
                </Button>
              )}
            </div>

            <div className="grid gap-1">
              <Label className="text-muted-ink text-[12px]">އަޞްލު ސުރުޚީ</Label>
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
              <Label className="text-muted-ink text-[12px]">ދިވެހި ސުރުޚީ</Label>
              <ThaanaInput
                value={titleDv}
                onValueChange={setTitleDv}
                placeholder="ދިވެހި ސުރުޚީ…"
              />
            </div>

            <div className="flex gap-2">
              <div className="grid flex-1 gap-1">
                <Label className="text-muted-ink text-[12px]">ފެށޭ ޞަފުޙާ</Label>
                <Input
                  type="number"
                  dir="ltr"
                  min={1}
                  max={pageCount}
                  value={startPage}
                  onChange={(e) => setStartPage(Number(e.target.value) || 1)}
                  className="h-8 text-start"
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-muted-ink text-[12px]">ދަރަޖަ</Label>
                <div className="flex gap-1">
                  {[1, 2, 3].map((l) => (
                    <Button
                      key={l}
                      type="button"
                      size="sm"
                      variant={level === l ? "default" : "outline"}
                      className="font-arabic h-8 w-8 p-0"
                      onClick={() => setLevel(l)}
                    >
                      {l}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <Button type="button" onClick={submit} disabled={pending || !title.trim()}>
              <PlusIcon />
              {editing ? "ރައްކާކުރައްވާ" : "އިތުރުކުރައްވާ"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setStartPage(currentPage)}
              className="text-muted-ink"
            >
              މިހާރުގެ ޞަފުޙާ ({currentPage}) ބޭނުންކުރައްވާ
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
