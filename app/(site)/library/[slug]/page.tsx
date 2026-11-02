import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site/site-header";
import { Thumb } from "@/components/site/thumb";
import { PdfPageView } from "@/components/pdf-page-view";
import { bookLabel, getLibraryBook } from "@/lib/books";
import { getReadablePageNumbers } from "@/lib/reading";
import { ContinueReading } from "@/components/site/reader/continue-reading";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/library/[slug]">) {
  const { slug } = await params;
  const book = getLibraryBook(slug);
  return book ? { title: bookLabel(book), description: book.description } : {};
}

export default async function LibraryBookPage({
  params,
  searchParams,
}: PageProps<"/library/[slug]">) {
  const { slug } = await params;
  // Search results carry the page they matched on.
  const { page } = await searchParams;
  const initialPage = Number(Array.isArray(page) ? page[0] : page) || 1;
  const book = getLibraryBook(slug);
  if (!book) notFound();

  // The reading view only exists once something has actually been translated.
  const readable = getReadablePageNumbers(book.id);

  return (
    <>
      <SiteHeader activeSlug={book.categorySlug} />

      <main className="mx-auto w-full max-w-[1140px] px-5 pt-6 pb-20">
        <Link
          href="/library"
          className="text-brand hover:text-brand-accent mb-5 inline-block min-h-11 py-2 text-[15px] transition-colors"
        >
          ← ފޮތްތައް
        </Link>

        <div className="border-rule mb-8 flex flex-wrap gap-8 border-b pb-8">
          <Thumb
            src={book.cover}
            alt=""
            sizes="260px"
            className="aspect-3/4 w-[220px] flex-none"
          />

          <div className="min-w-[260px] flex-1">
            {book.categoryName && (
              <Link
                href={`/library?category=${book.categorySlug}`}
                className="text-brand-accent hover:text-brand mb-2 inline-block text-[13px] transition-colors"
              >
                {book.categoryName}
              </Link>
            )}

            <h1 className="font-heading text-article-heading mb-3 text-[36px] leading-[1.45] text-pretty">
              {bookLabel(book)}
            </h1>

            {book.author && (
              <div className="text-muted-ink mb-4 text-[15px] leading-[1.9]">
                {book.author}
              </div>
            )}

            {book.description && (
              <p className="text-article-ink mb-5 max-w-[560px] text-[16px] leading-[2] text-pretty">
                {book.description}
              </p>
            )}

            <div className="text-faint-ink mb-6 flex flex-wrap gap-3 text-[13px]">
              <span className="font-arabic tabular-nums">{book.pageCount} ޞަފުޙާ</span>
              {book.pdfPath && (
                <>
                  <span className="text-[#A9C4DF]">•</span>
                  <span>PDF</span>
                </>
              )}
              {readable.length > 0 && (
                <>
                  <span className="text-[#A9C4DF]">•</span>
                  <span>
                    <span className="font-arabic tabular-nums">{readable.length}</span> ޞަފުޙާ
                    ތަރުޖަމާ
                  </span>
                </>
              )}
            </div>

            <div className="flex flex-wrap gap-2.5">
              {(readable.length > 0 || book.pdfPath) && (
                <ContinueReading
                  slug={slug}
                  firstPage={readable[0] ?? 1}
                  label={readable.length > 0 ? "ތަރުޖަމާ ކިޔުއްވާ" : "ފޮތް ކިޔުއްވާ"}
                />
              )}
              {book.pdfPath && (
                <a
                  href={book.pdfPath}
                  download
                  className="border-rule text-brand-deep hover:border-rule-strong hover:bg-paper-2 inline-flex min-h-11 items-center rounded-sm border px-5 text-[15px] transition-colors"
                >
                  ޑައުންލޯޑްކުރައްވާ
                </a>
              )}
            </div>
          </div>
        </div>

        {/* A taste of the scan; the full read lives in the reader, which
            remembers where you got to. */}
        {book.pdfPath && (
          <div className="border-rule-soft overflow-hidden rounded-[10px] border">
            <PdfPageView
              url={book.pdfPath}
              pageNo={initialPage}
              className="h-[52svh] w-full"
            />
            <div className="border-rule-soft bg-paper-4 flex items-center justify-center border-t px-4 py-3">
              <Link
                href={`/library/${slug}/read?page=${initialPage}`}
                className="text-brand hover:text-brand-deep text-[14.5px] leading-[1.8] transition-colors"
              >
                ފުރިހަމަ ފޮތް ކިޔުއްވުމަށް →
              </Link>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
