"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { GlobeIcon, EyeOffIcon, ExternalLinkIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setBookPublished } from "@/lib/book-actions";

/**
 * Publish switch for the book being translated.
 *
 * A book is invisible to readers until it is published — both the library and
 * the reading view filter on it — so the state belongs where the translating
 * happens, not only on the list page.
 */
export function BookPublish({
  id,
  slug,
  published,
  readablePages,
}: {
  id: number;
  slug: string;
  published: boolean;
  /** Translated pages available to read, used to warn before publishing an empty book. */
  readablePages: number;
}) {
  const [live, setLive] = useState(published);
  const [busy, start] = useTransition();

  const toggle = () => {
    const next = !live;
    setLive(next);
    start(async () => {
      const res = await setBookPublished(id, next);
      // Put the switch back if the server refused.
      if (res?.error) setLive(!next);
    });
  };

  return (
    <div className="flex flex-none items-center gap-1">
      <Button
        variant={live ? "default" : "outline"}
        size="sm"
        onClick={toggle}
        disabled={busy}
        title={
          live
            ? "ފޮތް ޢާންމުކޮށް ފެންނަނީ"
            : readablePages === 0
              ? "ތަރުޖަމާ ކުރެވިފައިވާ ޞަފުޙާއެއް އަދި ނެތް"
              : "ޢާންމުކޮށް ޝާއިޢުކުރައްވާ"
        }
      >
        {busy ? (
          <Loader2Icon className="animate-spin" />
        ) : live ? (
          <GlobeIcon />
        ) : (
          <EyeOffIcon />
        )}
        <span className="hidden sm:inline">{live ? "ޝާއިޢުކުރެވިފައި" : "ދެލިކޮޕީ"}</span>
      </Button>

      {live && (
        <Button asChild variant="ghost" size="icon" title="ކިޔެވުމުގެ ޞަފުޙާ ބައްލަވާ">
          <Link href={`/library/${slug}/read`} target="_blank" rel="noopener">
            <ExternalLinkIcon />
          </Link>
        </Button>
      )}
    </div>
  );
}
