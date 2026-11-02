import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getBook } from "@/lib/books";
import { getCategories } from "@/lib/queries";
import { getReadablePageNumbers } from "@/lib/reading";
import { PublishWizard, type PublishBook } from "@/components/admin/publish-wizard";

export const dynamic = "force-dynamic";

export default async function PublishPage({ params }: PageProps<"/admin/books/[id]/publish">) {
  await requireUser();

  const { id } = await params;
  const book = getBook(Number(id));
  if (!book) notFound();

  const wizardBook: PublishBook = {
    id: book.id,
    slug: book.slug,
    title: book.title,
    titleDv: book.titleDv,
    author: book.author,
    categoryId: book.categoryId,
    description: book.description,
    cover: book.cover,
    published: book.published,
    hasFile: !!book.pdfPath,
    pageCount: book.pageCount,
    readablePages: getReadablePageNumbers(book.id).length,
  };

  return <PublishWizard book={wizardBook} categories={getCategories()} />;
}
