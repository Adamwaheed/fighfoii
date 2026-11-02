"use client";

import Link from "next/link";
import { useState } from "react";
import type { ArticleWithCategory } from "@/lib/types";
import { timeAgo } from "@/lib/utils-format";
import { Thumb } from "./thumb";

export function SideTabs({
  latest,
  popular,
}: {
  latest: ArticleWithCategory[];
  popular: ArticleWithCategory[];
}) {
  const [tab, setTab] = useState<"latest" | "popular">("latest");
  const rows = tab === "latest" ? latest : popular;

  const tabButton = (key: "latest" | "popular", label: string) => (
    <button
      type="button"
      onClick={() => setTab(key)}
      aria-pressed={tab === key}
      className="hover:text-brand relative min-h-11 px-3.5 py-2.5 text-[15px] leading-[1.7] text-[#2A3D66] transition-colors"
    >
      {label}
      {tab === key && <span className="bg-brand-accent absolute inset-x-2 -bottom-px h-0.5" />}
    </button>
  );

  return (
    <aside className="min-w-[260px] flex-[1_1_300px]">
      <div className="border-rule mb-1.5 flex border-b">
        {tabButton("latest", "އެންމެފަސް")}
        {tabButton("popular", "މަގްބޫލް")}
      </div>

      {rows.map((a) => (
        <article key={a.id} className="border-rule-soft border-b">
          <Link href={`/article/${a.slug}`} className="group flex items-start gap-3 py-3">
            <Thumb src={a.image} alt="" sizes="100px" className="h-16 w-21 flex-none" />
            <div>
              <div className="text-ink-soft group-hover:text-brand text-[15.5px] leading-[1.85] text-pretty transition-colors">
                {a.title}
              </div>
              <div className="text-faint-ink mt-1.5 flex gap-2 text-[11.5px] leading-[1.8]">
                <span>{timeAgo(a.publishedAt)}</span>
                <span className="text-[#A9C4DF]">•</span>
                <span>{a.views.toLocaleString("en-US")} ކިޔުން</span>
              </div>
            </div>
          </Link>
        </article>
      ))}
    </aside>
  );
}
