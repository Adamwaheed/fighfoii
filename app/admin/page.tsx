import Link from "next/link";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAllArticles, getStats } from "@/lib/queries";
import { STATUS_LABELS } from "@/lib/types";
import { timeAgo } from "@/lib/utils-format";
import { FileTextIcon, EyeIcon, TagsIcon, PencilIcon } from "lucide-react";

export const dynamic = "force-dynamic";

export default function AdminDashboard() {
  const stats = getStats();
  const recent = getAllArticles().slice(0, 8);

  const tiles = [
    { label: "ޝާއިޢުކޮށްފައި", value: stats.published, icon: FileTextIcon },
    { label: "ދެލިކޮޕީ", value: stats.drafts, icon: PencilIcon },
    { label: "ބައިތައް", value: stats.categories, icon: TagsIcon },
    { label: "ޖުމުލަ ކިޔުން", value: stats.views, icon: EyeIcon },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label}>
            <CardHeader>
              <CardTitle className="text-muted-foreground text-sm font-normal">
                {t.label}
              </CardTitle>
              <CardAction>
                <t.icon className="text-brand-accent size-4" />
              </CardAction>
            </CardHeader>
            <CardContent>
              <div className="font-heading text-heading-ink text-3xl">
                {t.value.toLocaleString("en-US")}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl">ފަހުގެ ލިޔުންތައް</CardTitle>
          <CardAction>
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/articles">ހުރިހާ ލިޔުމެއް</Link>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col">
          {recent.map((a) => (
            <Link
              key={a.id}
              href={`/admin/articles/${a.id}`}
              className="hover:bg-accent -mx-2 flex flex-wrap items-center justify-between gap-3 rounded-sm border-b px-2 py-3 last:border-b-0"
            >
              <div className="min-w-0">
                <div className="font-sans text-heading-ink truncate text-[19px] leading-[1.7]">
                  {a.title}
                </div>
                <div className="text-muted-foreground mt-0.5 text-xs">
                  {a.categoryName} · {timeAgo(a.updatedAt)}
                </div>
              </div>
              <Badge variant={a.status === "published" ? "default" : "secondary"}>
                {STATUS_LABELS[a.status]}
              </Badge>
            </Link>
          ))}
          {recent.length === 0 && (
            <p className="text-muted-foreground py-8 text-center text-sm">
              އަދި ލިޔުމެއް ނެތެވެ.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
