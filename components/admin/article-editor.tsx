"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { BlockEditor, type DraftBlock } from "./block-editor";
import { PageEditor } from "./page-editor";
import { ImageUploader } from "./image-uploader";
import { ThaanaToggle } from "./thaana-input";
import { TextToBlocks } from "./text-to-blocks";
import { deleteArticle, saveArticleMeta, saveBlocks, setArticleStatus } from "@/lib/actions";
import {
  PLACEMENT_LABELS,
  STATUS_LABELS,
  type ArticleWithCategory,
  type Category,
  type Placement,
} from "@/lib/types";
import {
  FileTextIcon,
  LayoutListIcon,
  SaveIcon,
  SlidersHorizontalIcon,
  Trash2Icon,
} from "lucide-react";

interface Meta {
  title: string;
  slug: string;
  kicker: string;
  excerpt: string;
  categoryId: string;
  author: string;
  image: string;
  placement: string;
}

export function ArticleEditor({
  article,
  categories,
  initialBlocks,
}: {
  article: ArticleWithCategory;
  categories: Category[];
  initialBlocks: DraftBlock[];
}) {
  const [meta, setMeta] = useState<Meta>({
    title: article.title,
    slug: article.slug,
    kicker: article.kicker,
    excerpt: article.excerpt,
    categoryId: String(article.categoryId),
    author: article.author,
    image: article.image,
    placement: article.placement,
  });
  const [blocks, setBlocks] = useState<DraftBlock[]>(initialBlocks);
  const [mode, setMode] = useState<"blocks" | "page">("page");
  const [metaOpen, setMetaOpen] = useState(false);
  const [pending, start] = useTransition();

  const setField = (k: keyof Meta, v: string) =>
    setMeta((m) => ({ ...m, [k]: v }));

  const persist = async () => {
    const fd = new FormData();
    fd.set("id", String(article.id));
    Object.entries(meta).forEach(([k, v]) => fd.set(k, v));
    await saveArticleMeta(fd);
    await saveBlocks(
      article.id,
      blocks.map(({ type, main, sub, ref, level, image, style }) => ({
        type,
        main,
        sub,
        ref,
        level,
        image,
        style,
      }))
    );
  };

  const save = () =>
    start(async () => {
      await persist();
      toast.success("ރައްކާކުރެވިއްޖެ");
    });

  const publish = () =>
    start(async () => {
      await persist();
      await setArticleStatus(article.id, "published");
      toast.success("ޝާއިޢުކުރެވިއްޖެ");
    });

  const unpublish = () =>
    start(async () => {
      await setArticleStatus(article.id, "draft");
      toast.success("ދެލިކޮޕީއަށް ބަދަލުކުރެވިއްޖެ");
    });

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="border-rule flex flex-wrap items-center justify-between gap-3 border-b pb-3.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/articles">← ލިޔުންތައް</Link>
          </Button>
          <Badge variant={article.status === "published" ? "default" : "secondary"}>
            {STATUS_LABELS[article.status]}
          </Badge>
          {article.status === "published" && (
            <Button asChild variant="link" size="sm">
              <Link href={`/article/${article.slug}`} target="_blank">
                ވެބްސައިޓުގައި ބައްލަވާ
              </Link>
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="border-rule flex overflow-hidden rounded-sm border">
            <Button
              variant={mode === "page" ? "default" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => setMode("page")}
            >
              <FileTextIcon />
              ޞަފުޙާގައި
            </Button>
            <Button
              variant={mode === "blocks" ? "default" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => setMode("blocks")}
            >
              <LayoutListIcon />
              ބްލޮކް
            </Button>
          </div>
          <ThaanaToggle />

          <TextToBlocks
            hasBlocks={blocks.length > 0}
            onInsert={(next, replace) =>
              setBlocks(replace ? next : [...blocks, ...next])
            }
          />

          <Button variant="outline" onClick={() => setMetaOpen(true)}>
            <SlidersHorizontalIcon />
            ތަފްޞީލު
          </Button>
          <Button variant="outline" onClick={save} disabled={pending}>
            <SaveIcon />
            ރައްކާކުރައްވާ
          </Button>
          {article.status === "published" ? (
            <Button variant="secondary" onClick={unpublish} disabled={pending}>
              ދެލިކޮޕީއަށް
            </Button>
          ) : (
            <Button onClick={publish} disabled={pending}>
              ޝާއިޢުކުރައްވާ
            </Button>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="ފޮހެލާ">
                <Trash2Icon className="text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="font-heading">ލިޔުން ފޮހެލަންތޯ؟</AlertDialogTitle>
                <AlertDialogDescription>
                  މި ޢަމަލު އަނބުރާ ނުގެނެވޭނެއެވެ. ލިޔުމާއި އޭގެ ހުރިހާ ބްލޮކެއް ފޮހެވޭނެއެވެ.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>ބާޠިލު</AlertDialogCancel>
                <AlertDialogAction onClick={() => start(() => deleteArticle(article.id))}>
                  ފޮހެލާ
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {mode === "page" ? (
        <Card>
          <CardContent className="py-8 ps-14 pe-6">
            <PageEditor
              blocks={blocks}
              onChange={setBlocks}
              meta={{ title: meta.title, kicker: meta.kicker, author: meta.author }}
              onMeta={(patch) => setMeta((m) => ({ ...m, ...patch }))}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="mx-auto w-full max-w-[900px]">
          {/* Body */}
          <div>
            <Input
              dir="rtl"
              value={meta.title}
              onChange={(e) => setField("title", e.target.value)}
              placeholder="ލިޔުމުގެ ސުރުޚީ…"
              className="font-heading text-heading-ink mb-4 h-auto rounded-none border-0 border-b bg-transparent px-0 py-3 text-[34px] leading-[1.5] shadow-none focus-visible:ring-0"
            />
            <BlockEditor blocks={blocks} onChange={setBlocks} />
          </div>
        </div>
      )}

      <MetaDialog
        meta={meta}
        setField={setField}
        categories={categories}
        open={metaOpen}
        onOpenChange={setMetaOpen}
      />
    </div>
  );
}

/**
 * Category, byline, excerpt and placement. These are set once and then left
 * alone, so they live behind a dialog rather than taking a permanent column
 * away from the writing surface.
 */
function MetaDialog({
  meta,
  setField,
  categories,
  open,
  onOpenChange,
}: {
  meta: Meta;
  setField: (k: keyof Meta, v: string) => void;
  categories: Category[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">ލިޔުމުގެ ތަފްޞީލު</DialogTitle>
          <DialogDescription>
            ބައި، ލިޔުންތެރިޔާ، ޚުލާޞާ އަދި ފުރަތަމަ ޞަފުޙާގެ މަޤާމު.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
        <Field label="ބައި">
          <Select
            value={meta.categoryId}
            onValueChange={(v) => setField("categoryId", v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="ކިކަރ">
          <Input
            dir="rtl"
            value={meta.kicker}
            onChange={(e) => setField("kicker", e.target.value)}
            placeholder="ބައިގެ ނަން…"
          />
        </Field>

        <Field label="ލިޔުންތެރިޔާ">
          <Input
            dir="rtl"
            value={meta.author}
            onChange={(e) => setField("author", e.target.value)}
            placeholder="ނަން…"
          />
        </Field>

        <Field label="ޚުލާޞާ">
          <Textarea
            dir="rtl"
            rows={4}
            value={meta.excerpt}
            onChange={(e) => setField("excerpt", e.target.value)}
            placeholder="ކުރު ޚުލާޞާއެއް…"
          />
        </Field>

        <Field label="ފުރަތަމަ ޞަފުޙާގެ މަޤާމު">
          <Select
            value={meta.placement}
            onValueChange={(v) => setField("placement", v as Placement)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PLACEMENT_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="ބޮޑު ފޮޓޯ">
          <ImageUploader
            value={meta.image}
            onChange={(url) => setField("image", url)}
            aspect={3 / 2}
          />
        </Field>

        <Field label="ސްލަގު">
          <Input
            dir="ltr"
            value={meta.slug}
            onChange={(e) => setField("slug", e.target.value)}
            className="text-start font-mono text-xs"
          />
        </Field>
    
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>ނިމިއްޖެ</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-muted-ink text-[13px]">{label}</Label>
      {children}
    </div>
  );
}
