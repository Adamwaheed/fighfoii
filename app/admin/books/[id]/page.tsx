import { notFound } from "next/navigation";
import { BookTranslator } from "@/components/admin/book-translator";
import { requireUser } from "@/lib/auth";
import {
  chapterRanges,
  getBook,
  getBookChapters,
  getBookPage,
  getBookPages,
  getPageBlocks,
} from "@/lib/books";
import { hasGeminiKey } from "@/lib/gemini";

export const dynamic = "force-dynamic";

export default async function BookPage({
  params,
  searchParams,
}: PageProps<"/admin/books/[id]">) {
  await requireUser();

  const { id } = await params;
  const book = getBook(Number(id));
  if (!book) notFound();

  const { page } = await searchParams;
  const requested = Number(Array.isArray(page) ? page[0] : page) || 1;
  const pageNo = Math.min(Math.max(requested, 1), book.pageCount);

  const current = getBookPage(book.id, pageNo);
  if (!current) notFound();

  const blocks = getPageBlocks(current.id).map((b) => ({
    key: `b${b.id}`,
    type: b.type,
    main: b.main,
    sub: b.sub,
    ref: b.ref,
    level: b.level,
    image: b.image,
    style: b.style,
  }));

  return (
    <BookTranslator
      key={current.id}
      book={book}
      pages={getBookPages(book.id)}
      chapters={chapterRanges(getBookChapters(book.id), book.pageCount)}
      page={current}
      initialBlocks={blocks}
      hasKey={hasGeminiKey()}
    />
  );
}
