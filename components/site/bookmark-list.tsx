"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { BookmarkIcon, XIcon } from "lucide-react";
import { Thumb } from "./thumb";
import {
  type Bookmark,
  listBookmarks,
  removeBookmark,
  subscribeBookmarks,
} from "@/lib/bookmarks";

/**
 * Cached snapshot: useSyncExternalStore compares by identity, so the list has
 * to be rebuilt only when the stored value actually changes.
 */
let cached: Bookmark[] = [];
let cachedRaw: string | null = null;

function snapshot(): Bookmark[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem("fiqhufoi.bookmarks.v1");
  } catch {
    return cached;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cached = listBookmarks();
  }
  return cached;
}

const EMPTY: Bookmark[] = [];

export function BookmarkList() {
  const items = useSyncExternalStore(
    subscribeBookmarks,
    snapshot,
    () => EMPTY
  );

  if (!items.length) {
    return (
      <div className="border-rule-soft rounded-[10px] border border-dashed py-16 text-center">
        <BookmarkIcon className="text-faint-ink mx-auto mb-3 size-7" aria-hidden />
        <p className="text-muted-ink text-[15px] leading-[2]">
          އަދި ލިޔުމެއް ރައްކާކުރައްވާފައި ނެތެވެ
        </p>
        <p className="text-faint-ink mt-1 text-[13px] leading-[1.9]">
          ލިޔުމެއްގެ ފުލުގައިވާ ރައްކާކުރައްވާ ފިތުން އިތުރުކުރެއްވޭނެ
        </p>
      </div>
    );
  }

  return (
    <ul className="grid gap-3.5">
      {items.map((b) => (
        <li key={b.slug}>
          <div className="border-rule-soft bg-paper-4 hover:border-rule-strong flex gap-3.5 rounded-[8px] border p-3 transition-colors">
            <Link href={`/article/${b.slug}`} className="group flex min-w-0 flex-1 gap-3.5">
              <Thumb
                src={b.image}
                alt=""
                sizes="120px"
                bordered={false}
                className="h-20 w-[106px] flex-none rounded-[5px]"
              />
              <div className="min-w-0">
                <div className="text-brand-accent mb-1 text-[12px] leading-[1.7]">
                  {b.categoryName}
                </div>
                <div className="font-sans text-heading-ink group-hover:text-brand text-[17px] leading-[1.75] font-semibold text-pretty transition-colors">
                  {b.title}
                </div>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => removeBookmark(b.slug)}
              aria-label="ނަގާލައްވާ"
              title="ނަގާލައްވާ"
              className="text-faint-ink hover:text-ink hover:bg-paper-2 inline-flex size-8 flex-none items-center justify-center self-start rounded-[4px] transition-colors"
            >
              <XIcon className="size-4" aria-hidden />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
