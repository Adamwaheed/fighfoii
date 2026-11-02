import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeleteCategoryButton } from "@/components/admin/delete-category-button";
import { createCategory, updateCategory } from "@/lib/actions";
import { getCategoriesWithCounts } from "@/lib/queries";
import { PlusIcon } from "lucide-react";

export const dynamic = "force-dynamic";

export default function CategoriesPage() {
  const categories = getCategoriesWithCounts();

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl">ބައިތައް</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ނަން</TableHead>
                <TableHead className="hidden sm:table-cell">ސްލަގު</TableHead>
                <TableHead>ލިޔުން</TableHead>
                <TableHead className="w-px" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((c) => (
                <TableRow key={c.id}>
                  <TableCell colSpan={3} className="p-0">
                    <form
                      action={updateCategory}
                      className="flex flex-wrap items-center gap-2 p-2"
                    >
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="sort" value={c.sort} />
                      <Input
                        dir="rtl"
                        name="name"
                        defaultValue={c.name}
                        className="font-heading h-9 w-36 text-[18px]"
                      />
                      <Input
                        dir="ltr"
                        name="slug"
                        defaultValue={c.slug}
                        className="h-9 w-32 text-start font-mono text-xs"
                      />
                      <Input
                        dir="rtl"
                        name="sub"
                        defaultValue={c.sub}
                        placeholder="ތަޢާރަފު…"
                        className="h-9 min-w-40 flex-1 text-sm"
                      />
                      <span className="text-muted-foreground w-10 text-center text-sm">
                        {c.count}
                      </span>
                      <Button type="submit" size="sm" variant="outline">
                        ރައްކާ
                      </Button>
                    </form>
                  </TableCell>
                  <TableCell className="p-2">
                    <DeleteCategoryButton id={c.id} name={c.name} count={c.count} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="font-heading text-xl">އައު ބައެއް</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createCategory} className="grid gap-3">
            <div className="grid gap-1.5">
              <Label className="text-muted-ink text-[13px]">ނަން</Label>
              <Input dir="rtl" name="name" required placeholder="ބައިގެ ނަން…" />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-muted-ink text-[13px]">ސްލަގު</Label>
              <Input dir="ltr" name="slug" placeholder="fiqh" className="text-start font-mono text-xs" />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-muted-ink text-[13px]">ތަޢާރަފު</Label>
              <Input dir="rtl" name="sub" placeholder="ކުރު ތަޢާރަފެއް…" />
            </div>
            <Button type="submit">
              <PlusIcon />
              އިތުރުކުރައްވާ
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
