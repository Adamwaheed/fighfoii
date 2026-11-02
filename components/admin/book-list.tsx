"use client";

import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { deleteBook } from "@/lib/book-actions";
import { BookEditDialog, type EditableBook } from "./book-edit-dialog";
import type { Category } from "@/lib/types";
import { timeAgo } from "@/lib/utils-format";
import { BookOpenIcon, FileTextIcon, FileIcon, Trash2Icon } from "lucide-react";

export interface BookRow {
  id: number;
  title: string;
  author: string;
  sourceType: "pdf" | "text";
  kind: "translate" | "file";
  pageCount: number;
  translated: number;
  approved: number;
  updatedAt: string;
  categoryId: number | null;
  categoryName: string;
  description: string;
  cover: string;
  published: boolean;
  hasFile: boolean;
}

/** Not started / in progress / complete, derived from the page counts. */
function status(b: BookRow) {
  // A download-only book has no translation to be behind on.
  if (b.kind === "file") return { label: "ފޮތެއް", variant: "secondary" as const };
  if (b.pageCount === 0) return { label: "ހުސް", variant: "outline" as const };
  if (b.translated === 0) return { label: "ނުފެށޭ", variant: "outline" as const };
  if (b.approved >= b.pageCount) return { label: "ފާސްވެފައި", variant: "default" as const };
  if (b.translated >= b.pageCount) return { label: "ބެލުމަށް", variant: "secondary" as const };
  return { label: "ކުރިއަށް", variant: "secondary" as const };
}

export function BookList({
  books,
  categories,
}: {
  books: BookRow[];
  categories: Category[];
}) {
  const [pending, start] = useTransition();

  if (books.length === 0) {
    return (
      <p className="text-muted-foreground grid place-items-center gap-2 py-16 text-center text-sm">
        <BookOpenIcon className="size-6 opacity-40" />
        އަދި ފޮތެއް ނެތެވެ.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ފޮތް</TableHead>
          <TableHead className="hidden sm:table-cell">ބާވަތް</TableHead>
          <TableHead className="hidden lg:table-cell">ބައި</TableHead>
          <TableHead className="hidden md:table-cell">ޞަފުޙާ</TableHead>
          <TableHead>ތަރުޖަމާ</TableHead>
          <TableHead className="hidden md:table-cell">ފާސްވި</TableHead>
          <TableHead>ޙާލަތު</TableHead>
          <TableHead className="hidden lg:table-cell">އުނިއިތުރު</TableHead>
          <TableHead className="w-px" />
        </TableRow>
      </TableHeader>

      <TableBody>
        {books.map((b) => {
          const st = status(b);
          const pct = b.pageCount ? Math.round((b.translated / b.pageCount) * 100) : 0;

          return (
            <TableRow key={b.id}>
              <TableCell>
                <Link
                  href={`/admin/books/${b.id}`}
                  className="font-heading text-heading-ink hover:text-brand text-[18px] leading-[1.7]"
                >
                  {b.title}
                </Link>
                <div className="text-muted-foreground text-xs">{b.author || "—"}</div>
              </TableCell>

              <TableCell className="hidden sm:table-cell">
                <span className="text-muted-ink inline-flex items-center gap-1.5 text-[13px]">
                  {b.sourceType === "text" ? (
                    <FileTextIcon className="size-3.5" />
                  ) : (
                    <FileIcon className="size-3.5" />
                  )}
                  {b.sourceType === "text" ? "ލިޔުން" : "PDF"}
                </span>
              </TableCell>

              <TableCell className="text-muted-ink hidden lg:table-cell text-[13px]">
                {b.categoryName || "—"}
                {b.published && (
                  <Badge variant="outline" className="ms-1.5 text-[11px]">
                    ލައިބްރަރީ
                  </Badge>
                )}
              </TableCell>

              <TableCell className="font-arabic hidden md:table-cell tabular-nums">
                {b.pageCount}
              </TableCell>

              <TableCell className="min-w-32">
                {b.kind === "file" ? (
                  <span className="text-faint-ink text-[12.5px]">—</span>
                ) : (
                  <>
                    <div className="font-arabic text-muted-ink mb-1 text-[12.5px] tabular-nums">
                      {b.translated}/{b.pageCount} · {pct}%
                    </div>
                    <div
                      className="bg-rule h-1 w-full overflow-hidden rounded-full"
                      role="progressbar"
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div className="bg-brand h-full" style={{ width: `${pct}%` }} />
                    </div>
                  </>
                )}
              </TableCell>

              <TableCell className="font-arabic hidden md:table-cell tabular-nums">
                {b.kind === "file" ? (
                  <span className="text-faint-ink">—</span>
                ) : (
                  <span className={b.approved > 0 ? "text-brand" : "text-muted-ink"}>
                    {b.approved}/{b.pageCount}
                  </span>
                )}
              </TableCell>

              <TableCell>
                <Badge variant={st.variant}>{st.label}</Badge>
              </TableCell>

              <TableCell className="hidden lg:table-cell whitespace-nowrap">
                {timeAgo(b.updatedAt)}
              </TableCell>

              <TableCell className="flex items-center gap-0.5">
                <BookEditDialog
                  book={{
                    id: b.id,
                    title: b.title,
                    author: b.author,
                    categoryId: b.categoryId,
                    description: b.description,
                    cover: b.cover,
                    published: b.published,
                    hasFile: b.hasFile,
                  } satisfies EditableBook}
                  categories={categories}
                />

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="ފޮހެލާ" disabled={pending}>
                      <Trash2Icon className="text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="font-heading">
                        {b.title} ފޮހެލަންތޯ؟
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        ފޮތާއި އޭގެ ހުރިހާ ޞަފުޙާއަކާއި ތަރުޖަމާތައް ފޮހެވޭނެއެވެ. މި ޢަމަލު އަނބުރާ
                        ނުގެނެވޭނެއެވެ.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>ބާޠިލު</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() =>
                          start(async () => {
                            await deleteBook(b.id);
                            toast.success("ފޮހެލެވިއްޖެ");
                          })
                        }
                      >
                        ފޮހެލާ
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
