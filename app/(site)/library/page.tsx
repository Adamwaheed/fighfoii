import Link from "next/link";
import { SiteHeader } from "@/components/site/site-header";
import { Thumb } from "@/components/site/thumb";
import { getLibraryBooks, getLibraryCategories, bookLabel } from "@/lib/books";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "ފޮތްތައް",
  description: "ދިވެހި ދީނީ ފޮތްތައް ބައްލަވައި ޑައުންލޯޑްކުރައްވާ",
};

export default async function LibraryPage({ searchParams }: PageProps<"/library">) {
  const { category } = await searchParams;
  const active = typeof category === "string" ? category : undefined;

  const books = getLibraryBooks(active);
  const categories = getLibraryCategories();

  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-[1140px] px-5 pt-8 pb-20">
        <div className="border-rule mb-7 border-b pb-3.5">
          <div className="text-brand-accent mb-1.5 text-[13px]">ލައިބްރަރީ</div>
          <h1 className="font-heading text-article-heading text-[38px] leading-[1.45]">
            ފޮތްތައް
          </h1>
          <p className="text-muted-ink mt-2 text-[14px] leading-[1.8]">
            ބައްލަވައި ޑައުންލޯޑްކުރެއްވޭ ފޮތްތައް
          </p>
        </div>

        {categories.length > 0 && (
          <div className="mb-7 flex flex-wrap gap-2">
            <Link
              href="/library"
              className={`min-h-9 rounded-sm border px-3 py-1.5 text-[13.5px] transition-colors ${
                active
                  ? "border-rule text-muted-ink hover:border-brand"
                  : "border-brand bg-brand text-paper"
              }`}
            >
              ހުރިހާ
            </Link>
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/library?category=${c.slug}`}
                className={`min-h-9 rounded-sm border px-3 py-1.5 text-[13.5px] transition-colors ${
                  active === c.slug
                    ? "border-brand bg-brand text-paper"
                    : "border-rule text-muted-ink hover:border-brand"
                }`}
              >
                {c.name}
                <span className="font-arabic ms-1.5 text-[12px] tabular-nums opacity-70">
                  {c.count}
                </span>
              </Link>
            ))}
          </div>
        )}

        {books.length === 0 ? (
          <div className="text-faint-ink border border-dashed border-[#B5D2EA] p-12 text-center text-[15.5px] leading-[2]">
            އަދި ފޮތެއް ޝާއިޢުކޮށްފައި ނެތެވެ.
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-7">
            {books.map((b) => (
              <article key={b.id}>
                <Link href={`/library/${b.slug}`} className="group block">
                  <Thumb
                    src={b.cover}
                    alt=""
                    sizes="(max-width: 768px) 50vw, 220px"
                    className="mb-3 aspect-3/4 w-full"
                  />
                  <h2 className="font-heading text-article-heading group-hover:text-brand text-[19px] leading-[1.6] text-pretty transition-colors">
                    {bookLabel(b)}
                  </h2>
                  {b.author && (
                    <div className="text-muted-ink mt-1 text-[13px] leading-[1.8]">
                      {b.author}
                    </div>
                  )}
                  <div className="text-faint-ink mt-1 flex flex-wrap gap-2 text-[12px]">
                    {b.categoryName && <span className="text-brand-accent">{b.categoryName}</span>}
                    <span className="font-arabic tabular-nums">{b.pageCount} ޞަފުޙާ</span>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
