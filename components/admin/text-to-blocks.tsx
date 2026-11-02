"use client";

import { useState, useTransition } from "react";
import { ClipboardPasteIcon, Loader2Icon, WandSparklesIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ThaanaTextarea } from "./thaana-input";
import { emptyBlock, type DraftBlock } from "./block-editor";
import { BLOCK_LABELS } from "@/lib/types";

interface StructuredBlock {
  type: DraftBlock["type"];
  main: string;
  sub: string;
  ref: string;
  level: number;
}

/**
 * Paste a whole piece of writing and have it laid out as blocks.
 *
 * The result is shown for review before anything is inserted — the model
 * decides what is a heading and what is a verse, and that judgement is worth
 * seeing before it lands on top of an article.
 */
export function TextToBlocks({
  onInsert,
  hasBlocks,
}: {
  onInsert: (blocks: DraftBlock[], replace: boolean) => void;
  hasBlocks: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState("");
  const [result, setResult] = useState<StructuredBlock[] | null>(null);
  const [busy, start] = useTransition();

  const run = () =>
    start(async () => {
      const res = await fetch("/api/articles/structure", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source }),
      });
      const data = (await res.json()) as { blocks?: StructuredBlock[]; error?: string };
      if (!res.ok || !data.blocks?.length) {
        toast.error(data.error ?? "ނުއުފެއްދުނު");
        return;
      }
      setResult(data.blocks);
    });

  const insert = (replace: boolean) => {
    if (!result) return;
    onInsert(
      result.map((b) => ({
        ...emptyBlock(b.type),
        main: b.main,
        sub: b.sub,
        ref: b.ref,
        level: b.level || 1,
      })),
      replace
    );
    toast.success(`${result.length} ބްލޮކް އިތުރުކުރެވިއްޖެ`);
    setOpen(false);
    setSource("");
    setResult(null);
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <ClipboardPasteIcon />
        ލިޔުން ތަރުތީބުކުރައްވާ
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">ލިޔުން ބްލޮކަށް</DialogTitle>
            <DialogDescription>
              ލިޔުން ޕޭސްޓްކުރައްވާ. ސުރުޚީ، އާޔަތް، ޙަދީޘް ފަދަ ބައިތައް ވަކިކޮށްދޭނެއެވެ.
            </DialogDescription>
          </DialogHeader>

          {!result ? (
            <ThaanaTextarea
              rows={12}
              value={source}
              onValueChange={setSource}
              placeholder="ލިޔުން މިތާ ޕޭސްޓްކުރައްވާ…"
              className="text-[15px] leading-[2]"
            />
          ) : (
            <div className="grid gap-2">
              <p className="text-muted-ink text-[13px] leading-[1.9]">
                <span className="font-arabic tabular-nums">{result.length}</span> ބްލޮކް —
                ބައްލަވާފައި އިތުރުކުރައްވާ
              </p>
              <ul className="grid gap-1.5">
                {result.map((b, i) => (
                  <li
                    key={i}
                    className="border-rule-soft grid gap-1 rounded-sm border p-2.5"
                  >
                    <span className="text-brand text-[12px]">{BLOCK_LABELS[b.type]}</span>
                    <span className="text-ink line-clamp-2 text-[14px] leading-[1.9]">
                      {b.main}
                    </span>
                    {b.sub && (
                      <span className="text-muted-ink line-clamp-1 text-[13px]">
                        {b.sub}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <DialogFooter className="gap-2">
            {!result ? (
              <Button onClick={run} disabled={busy || source.trim().length < 20}>
                {busy ? <Loader2Icon className="animate-spin" /> : <WandSparklesIcon />}
                ތަރުތީބުކުރައްވާ
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => setResult(null)}>
                  އަނބުރާ
                </Button>
                {hasBlocks && (
                  <Button variant="outline" onClick={() => insert(true)}>
                    ބަދަލުކުރައްވާ
                  </Button>
                )}
                <Button onClick={() => insert(false)}>
                  {hasBlocks ? "ފަހަތަށް އިތުރުކުރައްވާ" : "އިތުރުކުރައްވާ"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
