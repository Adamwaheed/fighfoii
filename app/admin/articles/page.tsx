import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAllArticles, getCategoryBySlug } from "@/lib/queries";
import { PLACEMENT_LABELS, STATUS_LABELS } from "@/lib/types";
import { formatDate, timeAgo } from "@/lib/utils-format";
import { PlusIcon } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ArticlesPage({ searchParams }: PageProps<"/admin/articles">) {
  const { category } = await searchParams;
  const slug = typeof category === "string" ? category : undefined;
  const filter = slug ? getCategoryBySlug(slug) : undefined;

  const articles = getAllArticles().filter(
    (a) => !filter || a.categoryId === filter.id
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-heading-ink text-2xl">
            {filter ? filter.name : "ލިޔުންތައް"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {articles.length} ލިޔުން
            {filter && (
              <>
                {" · "}
                <Link href="/admin/articles" className="text-brand underline">
                  ހުރިހާ ބައެއް
                </Link>
              </>
            )}
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/articles/new">
            <PlusIcon />
            އައު ލިޔުމެއް
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ސުރުޚީ</TableHead>
                <TableHead className="hidden md:table-cell">ބައި</TableHead>
                <TableHead className="hidden lg:table-cell">ލިޔުންތެރިޔާ</TableHead>
                <TableHead>ޙާލަތު</TableHead>
                <TableHead className="hidden sm:table-cell">މަޤާމު</TableHead>
                <TableHead className="hidden lg:table-cell">ތާރީޚު</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {articles.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <Link
                      href={`/admin/articles/${a.id}`}
                      className="font-sans text-heading-ink hover:text-brand text-[18px] leading-[1.7]"
                    >
                      {a.title}
                    </Link>
                    <div className="text-muted-foreground text-xs">
                      {timeAgo(a.updatedAt)} އުނިއިތުރު ގެނެވުނު
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{a.categoryName}</TableCell>
                  <TableCell className="hidden lg:table-cell">{a.author || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={a.status === "published" ? "default" : "secondary"}>
                      {STATUS_LABELS[a.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {a.placement === "none" ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <Badge variant="outline">{PLACEMENT_LABELS[a.placement]}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell whitespace-nowrap">
                    {formatDate(a.publishedAt) || "—"}
                  </TableCell>
                </TableRow>
              ))}
              {articles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground py-12 text-center">
                    ލިޔުމެއް ނެތެވެ.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
