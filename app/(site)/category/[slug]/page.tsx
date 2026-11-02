import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site/site-header";
import { getByCategory, getCategoryBySlug } from "@/lib/queries";
import { formatDate } from "@/lib/utils-format";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/category/[slug]">) {
  const { slug } = await params;
  const c = getCategoryBySlug(slug);
  return c ? { title: c.name, description: c.sub } : {};
}

export default async function CategoryPage({ params }: PageProps<"/category/[slug]">) {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) notFound();

  const articles = getByCategory(slug, 40);

  return (
    <>
      <SiteHeader activeSlug={slug} />

      <main className="mx-auto w-full max-w-[1140px] px-5 pt-8 pb-20">
        <div className="border-rule mb-[30px] border-b pb-3.5">
          <div className="text-brand-accent mb-1.5 text-[13px]">ބައި</div>
          <h1 className="font-heading text-heading-ink text-[38px] leading-[1.45]">
            {category.name}
          </h1>
          {category.sub && (
            <div className="text-muted-ink mt-2 text-[14px] leading-[1.8]">{category.sub}</div>
          )}
        </div>

        {articles.length === 0 ? (
          <div className="text-faint-ink border border-dashed border-[#B5D2EA] p-11 text-center text-[15.5px] leading-[2]">
            މި ބައިގައި އަދި ލިޔުމެއް ޝާއިޢުކޮށްފައި ނެތެވެ.
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(270px,1fr))] gap-[30px]">
            {articles.map((a) => (
              <article key={a.id} className="border-rule border-t pt-4">
                <Link href={`/article/${a.slug}`} className="group block">
                  <div className="text-brand-accent mb-[7px] text-[12.5px]">
                    {formatDate(a.publishedAt)}
                  </div>
                  <h3 className="font-heading text-heading-ink group-hover:text-brand mb-[9px] text-[25px] leading-[1.55] text-pretty transition-colors">
                    {a.title}
                  </h3>
                  <p className="mb-[9px] text-[15.5px] leading-[2] text-[#4A5E85] text-pretty">
                    {a.excerpt}
                  </p>
                  <div className="text-faint-ink text-[12.5px] leading-[1.8]">{a.author}</div>
                </Link>
              </article>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
