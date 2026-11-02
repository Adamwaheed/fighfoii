import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site/site-header";
import { BlockView } from "@/components/site/block-view";
import { ReaderShell } from "@/components/site/reader/reader-shell";
import { ReaderToc } from "@/components/site/reader/reader-toc";
import { PdfReader } from "@/components/site/pdf-reader";
import {
  getReadableBook,
  getReadablePageNumbers,
  getReaderPage,
  getToc,
} from "@/lib/reading";
import { computeHeadingNumbers } from "@/lib/headings";
import { bookLabel, chapterLabel } from "@/lib/books";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/library/[slug]/read">) {
  const { slug } = await params;
  const book = getReadableBook(slug);
  return book ? { title: `${bookLabel(book)} — ކިޔެވުން` } : {};
}

export default async function ReadPage({
  params,
  searchParams,
}: PageProps<"/library/[slug]/read">) {
  const { slug } = await params;
  const { page } = await searchParams;

  const book = getReadableBook(slug);
  if (!book) notFound();

  const readable = getReadablePageNumbers(book.id);
  const askedPage = Number(Array.isArray(page) ? page[0] : page);

  // No translation yet: a scanned book is still readable, and it belongs in the
  // same reading view rather than in a viewer bolted onto the detail page.
  if (!readable.length) {
    if (!book.pdfPath) notFound();

    return (
      <>
        <SiteHeader />
        <main className="mx-auto w-full max-w-[1000px] px-5 pt-6 pb-16">
          <div className="mb-4 text-[13px] leading-[1.9]">
            <Link
              href={`/library/${slug}`}
              className="text-brand-accent hover:text-brand transition-colors"
            >
              ← {bookLabel(book)}
            </Link>
          </div>
          <PdfReader
            slug={slug}
            url={book.pdfPath}
            pageCount={book.pageCount}
            initialPage={Number.isFinite(askedPage) && askedPage > 0 ? askedPage : 1}
          />
        </main>
      </>
    );
  }

  // An out-of-range or missing page falls back to the first readable one rather
  // than 404ing — the link may simply predate a change to the translation.
  const pageNo = readable.includes(askedPage) ? askedPage : readable[0];

  const current = getReaderPage(book.id, pageNo, readable);
  if (!current) notFound();

  const toc = getToc(book.id, readable);
  const headingNumbers = computeHeadingNumbers(current.blocks);

  return (
    <>
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-[1180px] gap-10 px-5 pt-6 pb-[90px]">
        <ReaderToc slug={slug} entries={toc} currentPage={pageNo} />

        <article className="min-w-0 flex-1">
          <div className="mb-1.5 text-[13px] leading-[1.9]">
            <Link href={`/library/${slug}`} className="text-brand-accent hover:text-brand transition-colors">
              ← {bookLabel(book)}
            </Link>
          </div>

          {current.chapter && (
            <h1 className="font-heading text-article-heading mt-4 mb-6 text-[30px] leading-[1.6] text-pretty">
              {chapterLabel(current.chapter)}
            </h1>
          )}

          <div className="text-faint-ink border-rule-soft mb-8 flex flex-wrap items-center gap-2.5 border-b pb-3 text-[12.5px] leading-[1.9]">
            {book.author && <span>{book.author}</span>}
            <span className="text-[#A9C4DF]">•</span>
            <span>
              <span className="font-arabic tabular-nums">{pageNo}</span> ޞަފުޙާ
            </span>
          </div>

          <ReaderShell
            slug={slug}
            pageNo={pageNo}
            prevPage={current.prevPage}
            nextPage={current.nextPage}
            index={current.index}
            total={current.total}
          >
            {/* Each block carries its id: marks anchor to it plus a character
                offset, which is what lets a highlight survive a re-render. */}
            <div className="reader-body">
              {current.blocks.map((b, i) => (
                <div key={b.id} data-block-id={b.id}>
                  <BlockView block={b} headingNo={headingNumbers[i]} />
                </div>
              ))}
            </div>
          </ReaderShell>
        </article>
      </main>
    </>
  );
}
