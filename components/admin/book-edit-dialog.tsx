"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUploader } from "./image-uploader";
import { updateBook } from "@/lib/book-actions";
import type { Category } from "@/lib/types";
import { PencilIcon } from "lucide-react";

export interface EditableBook {
  id: number;
  title: string;
  author: string;
  categoryId: number | null;
  description: string;
  cover: string;
  published: boolean;
  hasFile: boolean;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-muted-ink text-[13px]">{label}</Label>
      {children}
    </div>
  );
}

/** Book metadata plus the switch that puts it in the public library. */
export function BookEditDialog({
  book,
  categories,
}: {
  book: EditableBook;
  categories: Category[];
}) {
  const [open, setOpen] = useState(false);
  const [cover, setCover] = useState(book.cover);
  const [categoryId, setCategoryId] = useState(
    book.categoryId ? String(book.categoryId) : ""
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="އުނިއިތުރު">
          <PencilIcon />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">ފޮތުގެ ތަފްޞީލު</DialogTitle>
          <DialogDescription>
            ލައިބްރަރީގައި ދައްކަން ބޭނުންނަމަ ބައެއް ހޮއްވަވައި ޝާއިޢުކުރައްވާ.
          </DialogDescription>
        </DialogHeader>

        <form
          action={async (fd) => {
            fd.set("cover", cover);
            fd.set("categoryId", categoryId);
            await updateBook(fd);
            setOpen(false);
          }}
          className="grid gap-4 py-2"
        >
          <input type="hidden" name="id" value={book.id} />

          <Field label="ފޮތުގެ ނަން">
            <Input dir="rtl" name="title" defaultValue={book.title} required />
          </Field>

          <Field label="މުއައްލިފު">
            <Input dir="rtl" name="author" defaultValue={book.author} />
          </Field>

          <Field label="ބައި">
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="w-full">
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
          </Field>

          <Field label="ތަޢާރަފު">
            <Textarea
              dir="rtl"
              name="description"
              rows={4}
              defaultValue={book.description}
              placeholder="ފޮތާ ބެހޭ ކުރު ތަޢާރަފެއް…"
            />
          </Field>

          <Field label="ބޭރުގަނޑު">
            <ImageUploader value={cover} onChange={setCover} aspect={3 / 4} />
          </Field>

          <div className="border-rule flex items-center justify-between gap-3 border-t pt-4">
            <div>
              <Label htmlFor="published" className="text-[14px]">
                ލައިބްރަރީގައި ޝާއިޢުކުރައްވާ
              </Label>
              <p className="text-faint-ink mt-0.5 text-[12px] leading-[1.7]">
                {/* A translated book is readable without a PDF, so a missing
                    file is no longer a reason it cannot be published. */}
                {book.hasFile
                  ? "ފޮތް ވެބްސައިޓުން ބައްލަވައި ޑައުންލޯޑްކުރެއްވޭނެ."
                  : "ފާސްކުރެވިފައިވާ ތަރުޖަމާ ހުރިނަމަ ކިޔެވުމަށް ދެއްކޭނެ."}
              </p>
            </div>
            <Switch
              id="published"
              name="published"
              defaultChecked={book.published}
              disabled={!book.hasFile}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              ބާޠިލު
            </Button>
            <Button type="submit">ރައްކާކުރައްވާ</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
