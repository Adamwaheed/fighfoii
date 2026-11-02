import { notFound } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/site/site-header";
import { Thumb } from "@/components/site/thumb";
import { CheckoutForm } from "@/components/site/checkout-form";
import { formatPrice, getProduct } from "@/lib/store";
import { getSettings } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/store/[slug]">) {
  const { slug } = await params;
  const p = getProduct(slug);
  return p ? { title: p.title, description: p.description } : {};
}

export default async function ProductPage({ params }: PageProps<"/store/[slug]">) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product || !product.published) notFound();

  const settings = getSettings();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[900px] px-5 pt-6 pb-[90px]">
        <div className="mb-6 text-[13px] leading-[1.9]">
          <Link href="/store" className="text-brand-accent hover:text-brand transition-colors">
            ← ފިހާރަ
          </Link>
        </div>

        <div className="mb-9 flex flex-wrap gap-7">
          <Thumb
            src={product.cover}
            alt=""
            sizes="240px"
            className="aspect-3/4 w-[210px] flex-none"
          />

          <div className="min-w-[260px] flex-1">
            <h1 className="font-heading text-heading-ink mb-3 text-[30px] leading-[1.5] text-pretty">
              {product.title}
            </h1>
            <div className="text-brand font-arabic mb-4 text-[22px] tabular-nums">
              {formatPrice(product.price)}
            </div>
            {product.description && (
              <p className="text-article-ink text-[15px] leading-[2.05] whitespace-pre-wrap">
                {product.description}
              </p>
            )}
          </div>
        </div>

        <CheckoutForm
          productId={product.id}
          bankDetails={settings.bank_details ?? ""}
        />
      </main>
    </>
  );
}
