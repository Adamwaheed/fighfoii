import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site/site-header";
import { BlockList } from "@/components/site/block-view";
import { getArticleBySlug, getBlocks, getRelated } from "@/lib/queries";
import { formatDate, readingTime } from "@/lib/utils-format";
import {
  BookmarkButton,
  CopyCitation,
  SearchHighlight,
  ShareRow,
} from "@/components/site/article-tools";
import { FontSizeControls } from "@/components/site/reader-controls";
import { CommentForm, Engagement } from "@/components/site/engagement";
import { getCounts } from "@/lib/engagement";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/article/[slug]">) {
  const { slug } = await params;
  const a = getArticleBySlug(slug);
  if (!a) return {};

  const url = `/article/${a.slug}`;
  // Messaging apps show the image, so a featured one must be absolute and
  // declared with its type; without these the preview falls back to bare text.
  const image = a.image || "/logo.png";

  return {
    title: a.title,
    description: a.excerpt,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: a.title,
      description: a.excerpt,
      url,
      siteName: "ފިޤުހު ފޮއި",
      locale: "dv_MV",
      publishedTime: a.publishedAt,
      authors: a.author ? [a.author] : undefined,
      section: a.categoryName,
      images: [{ url: image, width: 1200, height: 630, alt: a.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: a.title,
      description: a.excerpt,
      images: [image],
    },
  };
}

export default async function ArticlePage({
  params,
  searchParams,
}: PageProps<"/article/[slug]">) {
  const { slug } = await params;
  // Carried over from search results, to highlight what was looked for.
  const { q } = await searchParams;
  const query = (Array.isArray(q) ? q[0] : q) ?? "";
  const article = getArticleBySlug(slug);
  if (!article || article.status !== "published") notFound();

  const blocks = getBlocks(article.id);
  const related = getRelated(article.categoryId, article.id, 4);
  const words = blocks.reduce((n, b) => n + b.main.split(/\s+/).filter(Boolean).length, 0);
  const shareUrl = `${SITE_URL}/article/${article.slug}`;
  const counts = getCounts(article.id);

  return (
    <>
      <SiteHeader activeSlug={article.categorySlug} />

      <main className="mx-auto w-full max-w-[860px] px-5 pt-6 pb-[90px] sm:px-[50px]">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/category/${article.categorySlug}`}
            className="text-brand hover:text-brand-accent min-h-11 py-2 text-[15px] leading-[1.7] transition-colors"
          >
            ← {article.categoryName}
          </Link>
          <FontSizeControls />
        </div>

        <h1 className="font-heading text-article-heading mt-10 mb-[33.5px] text-[50px] leading-[75px] text-pretty">
          {article.title}
        </h1>
        <div className="border-rule text-muted-ink mb-[30px] flex flex-wrap items-center gap-[11px] border-b pb-4 text-[13.5px] leading-[1.9]">
          <span>{article.author}</span>
          <span className="text-[#A9C4DF]">•</span>
          <span>{formatDate(article.publishedAt)}</span>
          <span className="text-[#A9C4DF]">•</span>
          <span>{readingTime(words)}</span>
        </div>

        <div className="prose-thaana" data-article-body>
          <BlockList blocks={blocks} />
        </div>

        <div className="border-rule-soft mt-9 flex flex-wrap items-center justify-between gap-3 border-t pt-5">
          <Engagement slug={article.slug} views={counts.views} likes={counts.likes} />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <ShareRow url={shareUrl} title={article.title} />
          <BookmarkButton
            seed={{
              slug: article.slug,
              title: article.title,
              excerpt: article.excerpt,
              image: article.image,
              categoryName: article.categoryName,
            }}
          />
        </div>

        <div className="mt-8">
          <CommentForm slug={article.slug} />
        </div>

        <CopyCitation
          title={article.title}
          author={article.author}
          published={formatDate(article.publishedAt)}
          url={shareUrl}
          siteName="ފިޤުހު ފޮއި"
        />
        {query && <SearchHighlight query={query} />}

        {related.length > 0 && (
          <div className="border-rule mt-[52px] border-t pt-5">
            <div className="font-heading text-heading-ink mb-3.5 text-[22px] leading-[1.5]">
              މިބާވަތުގެ އިތުރު ލިޔުންތައް
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-[22px]">
              {related.map((a) => (
                <Link
                  key={a.id}
                  href={`/article/${a.slug}`}
                  className="border-rule-soft group border-t pt-3"
                >
                  <div className="text-brand-accent mb-1.5 text-[12px]">{a.categoryName}</div>
                  <div className="font-heading text-heading-ink group-hover:text-brand text-[20px] leading-[1.6] text-pretty transition-colors">
                    {a.title}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
