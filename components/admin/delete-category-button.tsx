"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { deleteCategory } from "@/lib/actions";
import { Trash2Icon } from "lucide-react";

export function DeleteCategoryButton({
  id,
  name,
  count,
}: {
  id: number;
  name: string;
  count: number;
}) {
  const [pending, start] = useTransition();

  // A category holding articles can't be removed — say so instead of failing silently.
  if (count > 0) {
    return (
      <Button
        variant="ghost"
        size="icon"
        disabled
        title="މި ބައިގައި ލިޔުންތައް ހުރުމުން ނުފޮހެވޭނެ"
        aria-label="ނުފޮހެވޭނެ"
      >
        <Trash2Icon className="opacity-30" />
      </Button>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="ފޮހެލާ" disabled={pending}>
          <Trash2Icon className="text-destructive" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-heading">{name} ފޮހެލަންތޯ؟</AlertDialogTitle>
          <AlertDialogDescription>މި ޢަމަލު އަނބުރާ ނުގެނެވޭނެއެވެ.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>ބާޠިލު</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              start(async () => {
                const res = await deleteCategory(id);
                if (res?.error) toast.error(res.error);
                else toast.success("ފޮހެލެވިއްޖެ");
              })
            }
          >
            ފޮހެލާ
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
