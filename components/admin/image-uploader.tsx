"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import ReactCrop, { type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImageUpIcon, LoaderCircleIcon, Trash2Icon, CropIcon } from "lucide-react";

/** Longest edge we send to the server; it re-caps to 1600 after processing. */
const CLIENT_CAP = 2000;

const ASPECTS: { label: string; value: number | undefined }[] = [
  { label: "މިނިވަން", value: undefined },
  { label: "16:9", value: 16 / 9 },
  { label: "3:2", value: 3 / 2 },
  { label: "4:3", value: 4 / 3 },
  { label: "1:1", value: 1 },
];

function kb(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)}MB`
    : `${Math.round(bytes / 1024)}KB`;
}

/**
 * Pick → crop → optimise → upload. The crop is rasterised on a canvas and sent
 * as WebP, so a 6MB phone photo leaves the browser already small; the server
 * then re-encodes and caps the width.
 */
export function ImageUploader({
  value,
  onChange,
  aspect: defaultAspect,
  className = "",
}: {
  value: string;
  onChange: (url: string) => void;
  aspect?: number;
  className?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [src, setSrc] = useState<string>("");
  const [crop, setCrop] = useState<Crop>();
  const [completed, setCompleted] = useState<PixelCrop>();
  const [aspect, setAspect] = useState<number | undefined>(defaultAspect);
  const [busy, setBusy] = useState(false);

  const pick = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("ފޮޓޯއެއް ހޮއްވަވާ");
      return;
    }
    setCrop(undefined);
    setCompleted(undefined);
    setSrc(URL.createObjectURL(file));
  };

  const closeCropper = () => {
    if (src) URL.revokeObjectURL(src);
    setSrc("");
    if (fileRef.current) fileRef.current.value = "";
  };

  async function upload() {
    const image = imgRef.current;
    if (!image) return;

    setBusy(true);
    try {
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      // No crop drawn means "use the whole image".
      const area = completed?.width
        ? {
            x: completed.x * scaleX,
            y: completed.y * scaleY,
            w: completed.width * scaleX,
            h: completed.height * scaleY,
          }
        : { x: 0, y: 0, w: image.naturalWidth, h: image.naturalHeight };

      const scale = area.w > CLIENT_CAP ? CLIENT_CAP / area.w : 1;
      const outW = Math.max(1, Math.round(area.w * scale));
      const outH = Math.max(1, Math.round(area.h * scale));

      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(image, area.x, area.y, area.w, area.h, 0, 0, outW, outH);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/webp", 0.92)
      );
      if (!blob) throw new Error("encode");

      const body = new FormData();
      body.append("file", new File([blob], "upload.webp", { type: "image/webp" }));

      const res = await fetch("/api/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "upload failed");

      onChange(data.url);
      toast.success(`ފޮޓޯ އަޕްލޯޑްވެއްޖެ — ${data.width}×${data.height}, ${kb(data.bytes)}`);
      closeCropper();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "އަޕްލޯޑް ނުކުރެވުނު");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`grid gap-2 ${className}`}>
      {value ? (
        <div className="border-rule bg-paper-3 relative h-[160px] w-full overflow-hidden border">
          <Image src={value} alt="" fill sizes="400px" className="object-cover" />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            pick(e.dataTransfer.files?.[0]);
          }}
          className="border-rule-strong text-muted-ink hover:border-brand hover:text-brand grid h-[120px] w-full place-items-center gap-1 border border-dashed text-[13.5px] transition-colors"
        >
          <ImageUpIcon className="size-5" />
          ފޮޓޯ ދޫކުރައްވާ ނުވަތަ ހޮއްވަވާ
        </button>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
          <ImageUpIcon className="size-3.5" />
          {value ? "ބަދަލުކުރައްވާ" : "އަޕްލޯޑް"}
        </Button>
        {value && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onChange("")}
            className="text-destructive"
          >
            <Trash2Icon className="size-3.5" />
            ފޮހެލާ
          </Button>
        )}
        <Input
          dir="ltr"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://… (ލިންކު)"
          className="h-8 min-w-40 flex-1 text-start font-mono text-[11px]"
        />
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />

      <Dialog open={!!src} onOpenChange={(o) => !o && closeCropper()}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">
              <CropIcon className="me-2 inline size-4" />
              ފޮޓޯ ކްރޮޕްކުރައްވާ
            </DialogTitle>
            <DialogDescription>
              ބޭނުންވާ ބައި ހޮއްވަވާ. ރައްކާކުރާއިރު ވެބަށް އެންމެ އެކަށޭނަ ގޮތަށް ކުޑަކުރެވޭނެއެވެ.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap gap-1.5">
            {ASPECTS.map((a) => (
              <Button
                key={a.label}
                type="button"
                size="sm"
                variant={aspect === a.value ? "default" : "outline"}
                onClick={() => setAspect(a.value)}
              >
                {a.label}
              </Button>
            ))}
          </div>

          <div className="bg-paper-3 grid max-h-[52svh] place-items-center overflow-auto p-2">
            {src && (
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompleted(c)}
                aspect={aspect}
                keepSelection
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imgRef}
                  src={src}
                  alt=""
                  style={{ maxHeight: "48svh", maxWidth: "100%" }}
                />
              </ReactCrop>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeCropper} disabled={busy}>
              ބާޠިލު
            </Button>
            <Button type="button" onClick={upload} disabled={busy}>
              {busy && <LoaderCircleIcon className="animate-spin" />}
              ރައްކާކުރައްވާ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
