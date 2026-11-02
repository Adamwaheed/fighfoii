"use client";

import { useState, useTransition } from "react";
import { LanguagesIcon, Loader2Icon, SparklesIcon, EyeIcon, PencilIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ThaanaInput, ThaanaTextarea } from "./thaana-input";
import { DiagramView } from "@/components/site/diagram-view";
import { countNodes, parseOutline } from "@/lib/diagram";

/**
 * Editor for a mind-map block.
 *
 * The outline is the stored value, so it is edited as text and previewed as
 * drawn — no separate canvas to keep in step with the data. Generation fills
 * the same field, which means anything the model produces can then be corrected
 * by hand rather than being a black box.
 */
export function DiagramField({
  outline,
  caption,
  onOutlineChange,
  onCaptionChange,
}: {
  outline: string;
  caption: string;
  onOutlineChange: (next: string) => void;
  onCaptionChange: (next: string) => void;
}) {
  const [source, setSource] = useState("");
  const [sourceOpen, setSourceOpen] = useState(false);
  const [preview, setPreview] = useState(true);
  const [busy, start] = useTransition();

  const tree = parseOutline(outline);
  const nodes = countNodes(tree);

  const generate = () =>
    start(async () => {
      const res = await fetch("/api/diagram", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source }),
      });
      const data = (await res.json()) as { outline?: string; error?: string };
      if (!res.ok || !data.outline) {
        toast.error(data.error ?? "ނުއުފެއްދުނު");
        return;
      }
      onOutlineChange(data.outline);
      setSourceOpen(false);
      toast.success("ޑަޔަގްރާމް އުފެއްދިއްޖެ");
    });

  return (
    <div className="grid gap-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setSourceOpen((v) => !v)}
          aria-pressed={sourceOpen}
        >
          <SparklesIcon />
          ލިޔުމަކުން އުފައްދަވާ
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setPreview((v) => !v)}
          aria-pressed={preview}
        >
          {preview ? <PencilIcon /> : <EyeIcon />}
          {preview ? "އުނިއިތުރު" : "ބައްލަވާ"}
        </Button>

        <span className="text-faint-ink ms-auto text-[12px]">
          <span className="font-arabic tabular-nums">{nodes}</span> ނުކުތާ
        </span>
      </div>

      {sourceOpen && (
        <div className="border-rule grid gap-2 rounded-sm border p-3">
          <ThaanaTextarea
            rows={5}
            value={source}
            onValueChange={setSource}
            placeholder="ޚުލާޞާކުރަން ބޭނުންވާ ލިޔުން މިތާ ލިޔުއްވާ…"
            className="text-[15px] leading-[2]"
          />
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" onClick={generate} disabled={busy || !source.trim()}>
              {busy ? <Loader2Icon className="animate-spin" /> : <LanguagesIcon />}
              އުފައްދަވާ
            </Button>
            <span className="text-faint-ink text-[12px] leading-[1.8]">
              މިހާރު ހުރި ޑަޔަގްރާމް ބަދަލުވާނެ
            </span>
          </div>
        </div>
      )}

      {preview && tree ? (
        <button
          type="button"
          onClick={() => setPreview(false)}
          className="border-rule-soft w-full rounded-sm border text-start"
          title="އުނިއިތުރުކުރެއްވުމަށް ފިއްތަވާ"
        >
          <DiagramView outline={outline} />
        </button>
      ) : (
        <ThaanaTextarea
          rows={8}
          value={outline}
          onValueChange={onOutlineChange}
          placeholder={"މައި ނުކުތާ\n  ދަށު ނުކުތާ\n    އޭގެ ދަށުން"}
          className="font-sans text-[15px] leading-[2]"
        />
      )}

      <div>
        <div className="text-muted-ink mb-1.5 text-[12.5px]">ތަޢާރަފު</div>
        <ThaanaInput
          value={caption}
          onValueChange={onCaptionChange}
          placeholder="ޑަޔަގްރާމްގެ ތަޢާރަފު…"
        />
      </div>
    </div>
  );
}
