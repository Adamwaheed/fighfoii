"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { setPageApproval } from "@/lib/book-actions";
import type { PageApproval } from "@/lib/books";
import {
  CheckCircle2Icon,
  CircleDashedIcon,
  TriangleAlertIcon,
} from "lucide-react";

export const APPROVAL_LABELS: Record<PageApproval, string> = {
  none: "ބަލައިނުލާ",
  approved: "ފާސްކޮށްފި",
  rejected: "އިޞްލާޙު ބޭނުން",
};

/** Reviewer verdict for one page: unchecked, approved, or needs work. */
export function ApprovalControl({
  pageId,
  approval,
  note,
  disabled,
}: {
  pageId: number;
  approval: PageApproval;
  note: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draftNote, setDraftNote] = useState(note);
  const [pending, start] = useTransition();

  const apply = (next: PageApproval) =>
    start(async () => {
      await setPageApproval(pageId, next, next === "rejected" ? draftNote : "");
      if (next === "none") setDraftNote("");
      toast.success(APPROVAL_LABELS[next]);
      setOpen(false);
      router.refresh();
    });

  const tone =
    approval === "approved"
      ? "border-brand text-brand"
      : approval === "rejected"
        ? "border-[#C68B7B] text-[#A8402A]"
        : "";

  const Icon =
    approval === "approved"
      ? CheckCircle2Icon
      : approval === "rejected"
        ? TriangleAlertIcon
        : CircleDashedIcon;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`flex-none ${tone}`}
          disabled={disabled || pending}
          title={APPROVAL_LABELS[approval]}
        >
          <Icon />
          <span className="hidden lg:inline">{APPROVAL_LABELS[approval]}</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[280px] p-3">
        <div className="grid gap-2.5">
          <div className="font-heading text-[15px]">ޞަފުޙާ ބެލުން</div>

          <Button
            type="button"
            size="sm"
            variant={approval === "approved" ? "default" : "outline"}
            onClick={() => apply("approved")}
            disabled={pending}
            className="justify-start"
          >
            <CheckCircle2Icon />
            ފާސްކުރައްވާ
          </Button>

          <div className="grid gap-1.5">
            <Button
              type="button"
              size="sm"
              variant={approval === "rejected" ? "default" : "outline"}
              onClick={() => apply("rejected")}
              disabled={pending}
              className="justify-start"
            >
              <TriangleAlertIcon />
              އިޞްލާޙު ބޭނުން
            </Button>
            <Textarea
              dir="rtl"
              rows={3}
              value={draftNote}
              onChange={(e) => setDraftNote(e.target.value)}
              placeholder="އިޞްލާޙުކުރަންވީ ކަންތައް…"
              className="text-[14px]"
            />
          </div>

          {approval !== "none" && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => apply("none")}
              disabled={pending}
              className="justify-start"
            >
              <CircleDashedIcon />
              ސާފުކުރައްވާ
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
