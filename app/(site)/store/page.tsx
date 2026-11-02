import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site/site-header";
import { Thumb } from "@/components/site/thumb";
import { formatPrice, listProducts } from "@/lib/store";

export const metadata: Metadata = {
  title: "ފިހާރަ",
  description: "ދިރާސީ ފޮތްތައް",
};

export const dynamic = "force-dynamic";

export default function StorePage() {
  const products = listProducts(true);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1140px] px-5 pt-8 pb-[90px]">
        <h1 className="font-heading text-heading-ink mb-1.5 text-[32px] leading-[1.5]">
          ފިހާރަ
        </h1>
        <p className="text-muted-ink mb-8 text-[14.5px] leading-[1.95]">
          ދިރާސީ ފޮތްތައް. ފައިސާ ދެއްކެވުމަށްފަހު ސްލިޕް އަޕްލޯޑްކުރެއްވުމުން، ބެއްލެވުމަށްފަހު
          އީމެއިލްއިން ފޮތް ފޮނުވޭނެއެވެ.
        </p>

        {products.length === 0 ? (
          <p className="text-faint-ink border-rule-soft rounded-[10px] border border-dashed py-16 text-center text-[14.5px]">
            އަދި ފޮތެއް ނެތެވެ
          </p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-6">
            {products.map((p) => (
              <article key={p.id}>
                <Link href={`/store/${p.slug}`} className="group block">
                  <Thumb
                    src={p.cover}
                    alt=""
                    sizes="(max-width: 768px) 50vw, 240px"
                    className="mb-3 aspect-3/4 w-full"
                  />
                  <h2 className="font-sans text-heading-ink group-hover:text-brand text-[17px] leading-[1.7] font-semibold text-pretty transition-colors">
                    {p.title}
                  </h2>
                  <div className="text-brand-accent font-arabic mt-1.5 text-[14px] tabular-nums">
                    {formatPrice(p.price)}
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
