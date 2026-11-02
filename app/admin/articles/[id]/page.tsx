import { notFound } from "next/navigation";
import { ArticleEditor } from "@/components/admin/article-editor";
import { getArticleById, getBlocks, getCategories } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function EditArticlePage({ params }: PageProps<"/admin/articles/[id]">) {
  const { id } = await params;
  const articleId = Number(id);
  if (!Number.isInteger(articleId)) notFound();

  const article = getArticleById(articleId);
  if (!article) notFound();

  const blocks = getBlocks(articleId).map((b) => ({
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
    <ArticleEditor
      article={article}
      categories={getCategories()}
      initialBlocks={blocks}
    />
  );
}
