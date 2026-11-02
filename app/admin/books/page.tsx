import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookList } from "@/components/admin/book-list";
import { BookUpload } from "@/components/admin/book-upload";
import { getBooks } from "@/lib/books";
import { getCategories } from "@/lib/queries";
import { requireUser } from "@/lib/auth";
import { hasGeminiKey } from "@/lib/gemini";
import { AlertCircleIcon } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "ފޮތްތައް" };

export default async function BooksPage() {
  await requireUser();
  const books = getBooks();
  const categories = getCategories();
  const keyed = hasGeminiKey();

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div className="grid gap-4">
        {!keyed && (
          <div className="text-muted-ink flex items-start gap-2.5 border border-[#E4D8B8] bg-[#FBF6E7] px-4 py-3 text-[13.5px] leading-[1.9]">
            <AlertCircleIcon className="text-brand-accent mt-1 size-4 flex-none" />
            <span>
              ތަރުޖަމާކުރެއްވުމަށް <code className="font-mono text-[12px]">GEMINI_API_KEY</code> ބޭނުންވެއެވެ.
              <code className="font-mono text-[12px]"> .env.local</code> ގައި އިތުރުކުރައްވާ. ފޮތް
              އަޕްލޯޑްކުރެއްވުމާއި އަތުން ލިޔުއްވުން މިހާރުވެސް މަސައްކަތްކުރާނެއެވެ.
            </span>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-xl">ފޮތްތައް</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <BookList
              books={books.map((b) => ({
                id: b.id,
                title: b.title,
                author: b.author,
                sourceType: b.sourceType,
    kind: b.kind,
                pageCount: b.pageCount,
                translated: b.translated,
                approved: b.approved,
                updatedAt: b.updatedAt,
                categoryId: b.categoryId,
                categoryName:
                  categories.find((c) => c.id === b.categoryId)?.name ?? "",
                description: b.description,
                cover: b.cover,
                published: b.published,
                hasFile: Boolean(b.pdfPath),
              }))}
              categories={categories}
            />
          </CardContent>
        </Card>
      </div>

      <BookUpload />
    </div>
  );
}
