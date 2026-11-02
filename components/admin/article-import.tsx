"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DownloadIcon, LoaderCircleIcon } from "lucide-react";

/** Pulls one published article in from a WordPress site as a new draft. */
export function ArticleImport() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/articles/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();

      if (res.status === 409 && data.articleId) {
        toast.info("މި ލިޔުން ކުރިންވެސް އިމްޕޯޓްކުރެވިފައިވެއެވެ");
        router.push(`/admin/articles/${data.articleId}`);
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "import failed");

      toast.success(`${data.blockCount} ބްލޮކް އިމްޕޯޓްވެއްޖެ`);
      router.push(`/admin/articles/${data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "އިމްޕޯޓް ނުކުރެވުނު");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      <div className="grid gap-1.5">
        <Label className="text-muted-ink text-[13px]">ލިޔުމުގެ ލިންކު</Label>
        <Input
          dir="ltr"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://dhisalafiyyah.net/article/47059"
          className="text-start font-mono text-[12px]"
        />
        <p className="text-faint-ink text-[12px] leading-[1.7]">
          ސުރުޚީ، ޚުލާޞާ، ފޮޓޯ އަދި ބްލޮކްތައް ގެނެވޭނެއެވެ. ދެލިކޮޕީއެއްގެ ގޮތުގައި
          ރައްކާވާނެތީ، ޝާއިޢުކުރެއްވުމުގެ ކުރިން ބައްލަވާލެއްވޭނެއެވެ.
        </p>
      </div>

      <Button type="submit" disabled={busy || !url.trim()}>
        {busy ? <LoaderCircleIcon className="animate-spin" /> : <DownloadIcon />}
        އިމްޕޯޓްކުރައްވާ
      </Button>
    </form>
  );
}
