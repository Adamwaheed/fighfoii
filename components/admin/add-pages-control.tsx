"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { addPages } from "@/lib/book-actions";
import { PlusIcon } from "lucide-react";

const QUICK = [1, 5, 10];

/** Appends blank pages to a book — one, a preset batch, or a custom count. */
export function AddPagesControl({
  bookId,
  onAdded,
}: {
  bookId: number;
  /** Called with the first new page number, so the caller can jump to it. */
  onAdded?: (firstPage: number) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(1);
  const [pending, start] = useTransition();

  const add = (count: number) =>
    start(async () => {
      const res = await addPages(bookId, count);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(`${res.added} ޞަފުޙާ އިތުރުކުރެވިއްޖެ`);
      setOpen(false);
      router.refresh();
      if (res.firstPage && onAdded) onAdded(res.firstPage);
    });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="ޞަފުޙާ އިތުރުކުރައްވާ"
          aria-label="ޞަފުޙާ އިތުރުކުރައްވާ"
          disabled={pending}
          className="border-rule text-muted-ink hover:border-brand hover:text-brand grid h-7 min-w-7 flex-none place-items-center rounded-sm border transition-colors disabled:opacity-40"
        >
          <PlusIcon className="size-3.5" />
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[240px] p-3">
        <div className="grid gap-3">
          <div className="font-heading text-[15px]">ޞަފުޙާ އިތުރުކުރައްވާ</div>

          <div className="flex gap-1.5">
            {QUICK.map((n) => (
              <Button
                key={n}
                type="button"
                size="sm"
                variant="outline"
                className="font-arabic flex-1 tabular-nums"
                disabled={pending}
                onClick={() => add(n)}
              >
                +{n}
              </Button>
            ))}
          </div>

          <div className="grid gap-1.5">
            <Label className="text-muted-ink text-[12.5px]">އަމިއްލަ ޢަދަދު</Label>
            <div className="flex gap-1.5">
              <Input
                type="number"
                min={1}
                max={200}
                dir="ltr"
                value={custom}
                onChange={(e) => setCustom(Number(e.target.value) || 1)}
                className="h-8 text-start"
              />
              <Button
                type="button"
                size="sm"
                disabled={pending}
                onClick={() => add(custom)}
              >
                އިތުރުކުރޭ
              </Button>
            </div>
          </div>

          <p className="text-faint-ink text-[12px] leading-[1.7]">
            އައު ޞަފުޙާތައް އެންމެ ފަހަތަށް އިތުރުވެ، ހުހަށް ހުންނާނެއެވެ.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
