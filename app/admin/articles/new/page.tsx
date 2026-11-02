import { createArticle } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArticleImport } from "@/components/admin/article-import";
import { PlusIcon } from "lucide-react";

export default function NewArticlePage() {
  return (
    <div className="mx-auto w-full max-w-lg pt-10">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-2xl">އައު ލިޔުމެއް</CardTitle>
          <CardDescription>
            ދެލިކޮޕީއެއް އުފައްދައި، ބްލޮކް އެޑިޓަރަށް ގެންދާނެއެވެ.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* A POST form rather than a link, so creation is never a GET side effect. */}
          <form action={createArticle}>
            <Button type="submit" className="w-full">
              <PlusIcon />
              ދެލިކޮޕީ އުފައްދަވާ
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="font-heading text-xl">ލިންކުން ގެންނަވާ</CardTitle>
          <CardDescription>
            ވެބްސައިޓެއްގައި ޝާއިޢުކޮށްފައިވާ ލިޔުމެއް ބްލޮކްތަކަށް ބަދަލުކޮށް ގެނެވޭނެއެވެ.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ArticleImport />
        </CardContent>
      </Card>
    </div>
  );
}
