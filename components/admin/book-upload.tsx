"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DEFAULT_CHARS_PER_PAGE, splitIntoPages } from "@/lib/text-split";
import { DownloadIcon, FileTextIcon, FileUpIcon, LinkIcon, LoaderCircleIcon } from "lucide-react";

export function BookUpload() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileOnly, setFileOnly] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  // Pasted-text mode.
  const [text, setText] = useState("");
  const [charsPerPage, setCharsPerPage] = useState(DEFAULT_CHARS_PER_PAGE);
  const [separator, setSeparator] = useState("");

  // URL import.
  const [importUrl, setImportUrl] = useState("");

  // Same splitter the server uses, so the count shown is the count created.
  const preview = useMemo(
    () => splitIntoPages(text, { charsPerPage, separator }),
    [text, charsPerPage, separator]
  );

  async function submitPdf(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) {
      toast.error("PDF އެއް ހޮއްވަވާ");
      return;
    }
    const form = new FormData(e.currentTarget);
    form.set("file", file);

    setBusy(true);
    try {
      const res = await fetch("/api/books/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "upload failed");
      toast.success(`${data.pageCount} ޞަފުޙާ ލިބިއްޖެ`);
      router.push(`/admin/books/${data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "އަޕްލޯޑް ނުކުރެވުނު");
    } finally {
      setBusy(false);
    }
  }

  async function submitText(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!preview.length) {
      toast.error("ލިޔުން ލިޔުއްވާ");
      return;
    }
    const form = new FormData(e.currentTarget);

    setBusy(true);
    try {
      const res = await fetch("/api/books/text", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: form.get("title"),
          author: form.get("author"),
          text,
          charsPerPage,
          separator,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "failed");
      toast.success(`${data.pageCount} ޞަފުޙާ އުފެދިއްޖެ`);
      router.push(`/admin/books/${data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ނުއުފެއްދުނު");
    } finally {
      setBusy(false);
    }
  }

  async function submitImport(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/books/import-turath", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: importUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "import failed");
      toast.success(
        `${data.pageCount} ޞަފުޙާ، ${data.chapterCount} ބާބު އިމްޕޯޓްވެއްޖެ`
      );
      router.push(`/admin/books/${data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "އިމްޕޯޓް ނުކުރެވުނު");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="font-heading text-xl">އައު ފޮތެއް</CardTitle>
        <CardDescription>PDF އަޕްލޯޑްކުރައްވާ ނުވަތަ ލިޔުން ޕޭސްޓްކުރައްވާ.</CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="pdf">
          <TabsList className="mb-4 w-full">
            <TabsTrigger value="pdf" className="flex-1">
              <FileUpIcon className="size-3.5" />
              PDF
            </TabsTrigger>
            <TabsTrigger value="text" className="flex-1">
              <FileTextIcon className="size-3.5" />
              ލިޔުން
            </TabsTrigger>
            <TabsTrigger value="url" className="flex-1">
              <LinkIcon className="size-3.5" />
              ލިންކު
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pdf">
            <form onSubmit={submitPdf} className="grid gap-3">
              <div className="grid gap-1.5">
                <Label className="text-muted-ink text-[13px]">ފޮތުގެ ނަން</Label>
                <Input dir="rtl" name="title" placeholder="ފޮތުގެ ނަން…" />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-muted-ink text-[13px]">މުއައްލިފު</Label>
                <Input dir="rtl" name="author" placeholder="ލިޔުއްވި ބޭފުޅާ…" />
              </div>

              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0];
                  if (f?.type === "application/pdf") setFile(f);
                  else toast.error("PDF އެއް ދޫކުރައްވާ");
                }}
                className="border-rule-strong text-muted-ink hover:border-brand hover:text-brand grid h-[110px] place-items-center gap-1 border border-dashed px-3 text-center text-[13.5px] transition-colors"
              >
                <FileUpIcon className="size-5" />
                {file ? file.name : "PDF ދޫކުރައްވާ ނުވަތަ ހޮއްވަވާ"}
              </button>

              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />

              {/* Some books are only ever a file to read and download; saying
                  so up front keeps them out of the translation queue. */}
              <label className="border-rule text-muted-ink flex cursor-pointer items-start gap-2.5 rounded-sm border p-3 text-[13.5px] leading-[1.8]">
                <input
                  type="checkbox"
                  name="kind"
                  value="file"
                  checked={fileOnly}
                  onChange={(e) => setFileOnly(e.target.checked)}
                  className="mt-1 size-4 flex-none"
                />
                <span>
                  <span className="text-ink block">ހަމައެކަނި ފޮތެއްގެ ގޮތުގައި</span>
                  ތަރުޖަމާ ނުކޮށް، ބައްލަވައި ޑައުންލޯޑްކުރެއްވުމަށް އެކަނި.
                </span>
              </label>

              <Button type="submit" disabled={busy || !file}>
                {busy && <LoaderCircleIcon className="animate-spin" />}
                އަޕްލޯޑްކުރައްވާ
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="text">
            <form onSubmit={submitText} className="grid gap-3">
              <div className="grid gap-1.5">
                <Label className="text-muted-ink text-[13px]">ފޮތުގެ ނަން</Label>
                <Input dir="rtl" name="title" placeholder="ފޮތުގެ ނަން…" />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-muted-ink text-[13px]">މުއައްލިފު</Label>
                <Input dir="rtl" name="author" placeholder="ލިޔުއްވި ބޭފުޅާ…" />
              </div>

              <div className="grid gap-1.5">
                <Label className="text-muted-ink text-[13px]">ޢަރަބި ލިޔުން</Label>
                <Textarea
                  dir="rtl"
                  rows={8}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="ފޮތުގެ ލިޔުން މިތަނަށް ޕޭސްޓްކުރައްވާ…"
                  className="font-arabic text-[17px] leading-[2]"
                />
              </div>

              <div className="grid gap-1.5">
                <Label className="text-muted-ink text-[13px]">
                  އެއް ޞަފުޙާގައި ހުންނަ އަކުރު — {charsPerPage}
                </Label>
                <Input
                  type="number"
                  min={200}
                  max={20000}
                  step={100}
                  value={charsPerPage}
                  onChange={(e) => setCharsPerPage(Number(e.target.value) || DEFAULT_CHARS_PER_PAGE)}
                  dir="ltr"
                  className="text-start"
                  disabled={Boolean(separator.trim())}
                />
              </div>

              <div className="grid gap-1.5">
                <Label className="text-muted-ink text-[13px]">
                  ޞަފުޙާ ވަކިކުރާ ނިޝާން (އިޚްތިޔާރީ)
                </Label>
                <Input
                  dir="ltr"
                  value={separator}
                  onChange={(e) => setSeparator(e.target.value)}
                  placeholder="---"
                  className="text-start font-mono text-[12px]"
                />
                <p className="text-faint-ink text-[12px] leading-[1.7]">
                  ލިޔުއްވައިފިނަމަ، އަކުރު ގުނުމުގެ ބަދަލުގައި މި ނިޝާނުން ވަކިކުރެވޭނެއެވެ.
                </p>
              </div>

              <div className="border-rule text-muted-ink flex items-center justify-between border-t pt-3 text-[13px]">
                <span>އުފެދޭނެ ޞަފުޙާ</span>
                <span className="font-arabic text-brand text-[15px] tabular-nums">
                  {preview.length}
                </span>
              </div>

              <Button type="submit" disabled={busy || preview.length === 0}>
                {busy && <LoaderCircleIcon className="animate-spin" />}
                ޞަފުޙާތައް އުފައްދަވާ
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="url">
            <form onSubmit={submitImport} className="grid gap-3">
              <div className="grid gap-1.5">
                <Label className="text-muted-ink text-[13px]">ފޮތުގެ ލިންކު</Label>
                <Input
                  dir="ltr"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  placeholder="https://app.turath.io/book/7477?page=1"
                  className="text-start font-mono text-[12px]"
                />
                <p className="text-faint-ink text-[12px] leading-[1.7]">
                  ފޮތުގެ ނަންބަރު އެކަނިވެސް ފުދޭނެއެވެ. ބާބުތަކާއި ހުރިހާ ޞަފުޙާއެއް
                  އެއްފަހަރާ އިމްޕޯޓްވާނެއެވެ.
                </p>
              </div>

              <Button type="submit" disabled={busy || !importUrl.trim()}>
                {busy ? (
                  <LoaderCircleIcon className="animate-spin" />
                ) : (
                  <DownloadIcon />
                )}
                އިމްޕޯޓްކުރައްވާ
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
