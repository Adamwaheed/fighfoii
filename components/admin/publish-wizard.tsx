"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BookOpenTextIcon,
  CheckIcon,
  ImageIcon,
  LanguagesIcon,
  Loader2Icon,
  TypeIcon,
  GlobeIcon,
  AlertTriangleIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUploader } from "./image-uploader";
import { NoThaana, ThaanaInput, ThaanaTextarea } from "./thaana-input";
import { translateBookTitle, updateBook } from "@/lib/book-actions";
import type { Category } from "@/lib/types";

export interface PublishBook {
  id: number;
  slug: string;
  title: string;
  titleDv: string;
  author: string;
  categoryId: number | null;
  description: string;
  cover: string;
  published: boolean;
  hasFile: boolean;
  pageCount: number;
  /** Translated and approved — the pages a reader can actually open. */
  readablePages: number;
}

const STEPS = [
  { key: "name", label: "ނަން", icon: TypeIcon },
  { key: "about", label: "ތަޢާރަފު", icon: BookOpenTextIcon },
  { key: "cover", label: "ބޭރުގަނޑު", icon: ImageIcon },
  { key: "publish", label: "ޝާއިޢުކުރުން", icon: GlobeIcon },
] as const;

/**
 * Publishing a book, one decision at a time, with a running preview of the
 * result.
 *
 * The form is not written until the last step: a half-filled book that someone
 * abandoned midway should not end up in the library. The one exception is the
 * title translation, which the server writes as it produces it — leaving the
 * result only in local state would throw away a paid API call if the wizard
 * were closed.
 */
export function PublishWizard({
  book,
  categories,
}: {
  book: PublishBook;
  categories: Category[];
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const [title, setTitle] = useState(book.title);
  const [titleDv, setTitleDv] = useState(book.titleDv);
  const [author, setAuthor] = useState(book.author);
  const [categoryId, setCategoryId] = useState(
    book.categoryId ? String(book.categoryId) : ""
  );
  const [description, setDescription] = useState(book.description);
  const [cover, setCover] = useState(book.cover);
  const [published, setPublished] = useState(book.published);

  const [saving, startSave] = useTransition();
  const [translating, startTranslate] = useTransition();

  const publishable = book.hasFile || book.readablePages > 0;
  const shownTitle = titleDv.trim() || title;

  const save = (goPublic: boolean) =>
    startSave(async () => {
      const fd = new FormData();
      fd.set("id", String(book.id));
      fd.set("title", title);
      fd.set("titleDv", titleDv);
      fd.set("author", author);
      fd.set("categoryId", categoryId);
      fd.set("description", description);
      fd.set("cover", cover);
      fd.set("published", goPublic ? "on" : "off");
      await updateBook(fd);
      toast.success(goPublic ? "ޝާއިޢުކުރެވިއްޖެ" : "ރައްކާކުރެވިއްޖެ");
      router.refresh();
    });

  return (
    <div className="mx-auto w-full max-w-[1140px] px-6 py-8">
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/admin/books/${book.id}`}>← {shownTitle}</Link>
        </Button>
        <h1 className="font-heading text-heading-ink text-[26px] leading-[1.5]">
          ޝާއިޢުކުރުން
        </h1>
      </div>

      {/* Step rail */}
      <ol className="mb-10 flex flex-wrap items-center gap-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = i < step;
          const active = i === step;
          return (
            <li key={s.key} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep(i)}
                className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-[14.5px] leading-[1.7] transition-colors ${
                  active
                    ? "border-brand bg-brand text-paper"
                    : done
                      ? "border-brand/40 text-brand hover:bg-paper-2"
                      : "border-rule text-muted-ink hover:bg-paper-2"
                }`}
              >
                {done ? <CheckIcon className="size-4" /> : <Icon className="size-4" />}
                {s.label}
              </button>
              {i < STEPS.length - 1 && (
                <span className="bg-rule hidden h-px w-6 sm:block" aria-hidden />
              )}
            </li>
          );
        })}
      </ol>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0">
          {step === 0 && (
            <Step title="ފޮތުގެ ނަން" hint="ދިވެހި ނަން ދޫކޮށްލައްވައިފިނަމަ އަޞްލު ނަން ދައްކާނެއެވެ.">
              <Row label="އަޞްލު ނަން">
                <NoThaana>
                  <Input
                    dir="rtl"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="font-arabic h-12 text-[17px]"
                  />
                </NoThaana>
              </Row>

              <Row label="ދިވެހި ނަން">
                <div className="flex gap-2">
                  <ThaanaInput
                    value={titleDv}
                    onValueChange={setTitleDv}
                    placeholder="ދިވެހި ނަން…"
                    className="h-12 flex-1 text-[17px]"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 flex-none"
                    disabled={translating}
                    onClick={() =>
                      startTranslate(async () => {
                        const res = await translateBookTitle(book.id);
                        if (res.error) {
                          toast.error(res.error);
                          return;
                        }
                        setTitleDv(res.title);
                      })
                    }
                  >
                    {translating ? (
                      <Loader2Icon className="animate-spin" />
                    ) : (
                      <LanguagesIcon />
                    )}
                    ތަރުޖަމާ
                  </Button>
                </div>
              </Row>

              <Row label="މުއައްލިފު">
                <NoThaana>
                  <Input
                    dir="rtl"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="font-arabic h-12 text-[17px]"
                  />
                </NoThaana>
              </Row>
            </Step>
          )}

          {step === 1 && (
            <Step title="ތަޢާރަފު" hint="ލައިބްރަރީގައި ފޮތުގެ ދަށުގައި ދައްކާ ކުރު ބަޔާން.">
              <Row label="ބައި">
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="h-12 w-full text-[16px]">
                    <SelectValue placeholder="ބައެއް ހޮއްވަވާ…" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Row>

              <Row label="ޚުލާޞާ">
                <ThaanaTextarea
                  value={description}
                  onValueChange={setDescription}
                  rows={7}
                  placeholder="ފޮތާ ބެހޭ ކުރު ތަޢާރަފެއް…"
                  className="text-[16px] leading-[2]"
                />
              </Row>
            </Step>
          )}

          {step === 2 && (
            <Step title="ބޭރުގަނޑު" hint="ދިގަށް ހުންނަ ފޮޓޯއެއް (3:4) އެންމެ ރަނގަޅު.">
              <div className="max-w-[420px]">
                <ImageUploader value={cover} onChange={setCover} aspect={3 / 4} />
              </div>
            </Step>
          )}

          {step === 3 && (
            <Step title="ޝާއިޢުކުރުން" hint="ފޮތް ޢާންމުކޮށް ފެންނާނީ މި ދެއްވުމުންނެވެ.">
              <ul className="mb-6 grid gap-2.5">
                <Check ok={!!shownTitle.trim()} label="ފޮތުގެ ނަން" />
                <Check ok={!!categoryId} label="ބައެއް ހޮއްވަވާފައި" />
                <Check ok={!!description.trim()} label="ޚުލާޞާ" />
                <Check ok={!!cover} label="ބޭރުގަނޑު" />
                <Check
                  ok={publishable}
                  label={
                    book.hasFile
                      ? "ޑައުންލޯޑްކުރެވޭ ފައިލެއް"
                      : `ފާސްކުރެވިފައިވާ ${book.readablePages} ޞަފުޙާ`
                  }
                  required
                />
              </ul>

              <div className="border-rule flex items-center justify-between gap-4 rounded-md border p-4">
                <div>
                  <Label htmlFor="wizard-published" className="text-[15px]">
                    ލައިބްރަރީގައި ދައްކަވާ
                  </Label>
                  <p className="text-faint-ink mt-1 text-[12.5px] leading-[1.8]">
                    {publishable
                      ? "ކިޔުންތެރިންނަށް ފެންނާނެ."
                      : "ފާސްކުރެވިފައިވާ ތަރުޖަމާއެއް ނުވަތަ ފައިލެއް ބޭނުންވޭ."}
                  </p>
                </div>
                <Switch
                  id="wizard-published"
                  checked={published}
                  onCheckedChange={setPublished}
                  disabled={!publishable}
                />
              </div>
            </Step>
          )}

          {/* Step controls */}
          <div className="border-rule mt-8 flex items-center gap-3 border-t pt-6">
            <Button
              variant="outline"
              disabled={step === 0}
              onClick={() => setStep((v) => Math.max(0, v - 1))}
            >
              <ArrowRightIcon />
              ކުރިއަށް
            </Button>

            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep((v) => v + 1)}>
                ދެން
                <ArrowLeftIcon />
              </Button>
            ) : (
              <Button onClick={() => save(published)} disabled={saving}>
                {saving ? <Loader2Icon className="animate-spin" /> : <CheckIcon />}
                ރައްކާކުރައްވާ
              </Button>
            )}

            <Button
              variant="ghost"
              className="ms-auto"
              disabled={saving}
              onClick={() => save(published)}
            >
              ރައްކާކޮށްފައި ނިކުންނަވާ
            </Button>
          </div>
        </section>

        {/* Live preview */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="text-faint-ink mb-2.5 text-[12px] leading-[1.9]">
            ލައިބްރަރީގައި ފެންނާނެ ގޮތް
          </div>
          <div className="border-rule-soft bg-paper-4 overflow-hidden rounded-[10px] border p-4 shadow-[0_1px_2px_rgba(11,26,61,0.05)]">
            <div className="bg-paper-3 relative mb-3 aspect-3/4 w-full overflow-hidden rounded-[6px]">
              {cover ? (
                <Image src={cover} alt="" fill sizes="280px" className="object-cover" />
              ) : (
                <span className="text-faint-ink absolute inset-0 grid place-items-center text-[13px]">
                  ބޭރުގަނޑު ނެތް
                </span>
              )}
            </div>

            <div className="text-heading-ink text-[17px] leading-[1.7] font-semibold text-pretty">
              {shownTitle || "ފޮތުގެ ނަން"}
            </div>
            {author && (
              <div className="font-arabic text-muted-ink mt-1 text-[13px]">{author}</div>
            )}
            {description && (
              <p className="text-article-ink mt-2 line-clamp-4 text-[13.5px] leading-[1.9]">
                {description}
              </p>
            )}

            <div className="text-faint-ink border-rule-soft mt-3 flex flex-wrap gap-2 border-t pt-2.5 text-[11.5px]">
              <span className="font-arabic tabular-nums">{book.pageCount} ޞަފުޙާ</span>
              {book.readablePages > 0 && (
                <>
                  <span>·</span>
                  <span>
                    <span className="font-arabic tabular-nums">{book.readablePages}</span>{" "}
                    ކިޔެވޭ
                  </span>
                </>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Step({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-6">
      <div>
        <h2 className="font-heading text-heading-ink text-[22px] leading-[1.6]">{title}</h2>
        {hint && (
          <p className="text-muted-ink mt-1.5 text-[13.5px] leading-[1.9]">{hint}</p>
        )}
      </div>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label className="text-muted-ink text-[13px]">{label}</Label>
      {children}
    </div>
  );
}

function Check({
  ok,
  label,
  required = false,
}: {
  ok: boolean;
  label: string;
  required?: boolean;
}) {
  return (
    <li className="flex items-center gap-2.5 text-[14.5px] leading-[1.9]">
      <span
        className={`grid size-6 flex-none place-items-center rounded-full ${
          ok
            ? "bg-brand/10 text-brand"
            : required
              ? "bg-destructive/10 text-destructive"
              : "bg-paper-3 text-faint-ink"
        }`}
      >
        {ok ? (
          <CheckIcon className="size-3.5" />
        ) : required ? (
          <AlertTriangleIcon className="size-3.5" />
        ) : (
          <span className="bg-current size-1.5 rounded-full" />
        )}
      </span>
      <span className={ok ? "text-ink" : "text-muted-ink"}>{label}</span>
      {!ok && !required && <span className="text-faint-ink text-[12px]">(އިޚްތިޔާރީ)</span>}
    </li>
  );
}
