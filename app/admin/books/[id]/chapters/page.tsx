import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { chapterRanges, getBook, getBookChapters } from "@/lib/books";
import { getReadablePageNumbers } from "@/lib/reading";
import {
  ChapterManager,
  type ManagedChapter,
} from "@/components/admin/chapter-manager";

export const dynamic = "force-dynamic";

export default async function ChaptersPage({ params }: PageProps<"/admin/books/[id]/chapters">) {
  await requireUser();

  const { id } = await params;
  const book = getBook(Number(id));
  if (!book) notFound();

  const readable = getReadablePageNumbers(book.id);
  const ranges = chapterRanges(getBookChapters(book.id), book.pageCount);

  const chapters: ManagedChapter[] = ranges.map((c) => ({
    id: c.id,
    title: c.title,
    titleDv: c.titleDv,
    startPage: c.startPage,
    endPage: c.endPage,
    level: c.level,
    pages: c.pages,
    // How much of the chapter a reader can actually reach.
    readablePages: readable.filter((p) => p >= c.startPage && p <= c.endPage).length,
  }));

  return (
    <ChapterManager
      bookId={book.id}
      bookTitle={book.title}
      pageCount={book.pageCount}
      chapters={chapters}
    />
  );
}
