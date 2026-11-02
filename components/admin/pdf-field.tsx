"use client";

import { useRef, useState } from "react";
import { FileTextIcon, Loader2Icon, UploadIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/**
 * Uploads a PDF for an inline article block.
 *
 * Unlike shop files, these are meant to be public — they sit under
 * public/uploads like images do, and the block renders them in place.
 */
export function PdfField({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file: File) => {
    if (file.type !== "application/pdf") {
      toast.error("PDF އެއް ހޮއްވަވާ");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast.error("ފައިލް ބޮޑުވެއްޖެ (25MB)");
      return;
    }

    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/upload/pdf", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "ނުކުރެވުނު");
      onChange(data.url);
      toast.success("އަޕްލޯޑްކުރެވިއްޖެ");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "އަޕްލޯޑް ނުކުރެވުނު");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  };

  return (
    <div className="grid gap-2">
      <input
        ref={ref}
        type="file"
        accept="application/pdf"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
        }}
      />

      {value ? (
        <div className="border-rule flex items-center gap-2 rounded-sm border p-2.5">
          <FileTextIcon className="text-muted-ink size-4 flex-none" aria-hidden />
          <span className="text-muted-ink min-w-0 flex-1 truncate text-[13px]" dir="ltr">
            {value.split("/").pop()}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 flex-none"
            onClick={() => onChange("")}
            aria-label="ނަގާލައްވާ"
          >
            <XIcon className="size-3.5" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => ref.current?.click()}
          className="justify-center"
        >
          {busy ? <Loader2Icon className="animate-spin" /> : <UploadIcon />}
          PDF އަޕްލޯޑްކުރައްވާ
        </Button>
      )}
    </div>
  );
}
