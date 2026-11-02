import Link from "next/link";
import type { ArticleWithCategory } from "@/lib/types";
import { timeAgo } from "@/lib/utils-format";
import { Thumb } from "./thumb";

const dot = <span className="text-[#A9C4DF]">•</span>;

/** Front-page hero article, presented as a card with the photo bled to its edges. */
export function LeadCard({ a }: { a: ArticleWithCategory }) {
  return (
    <article className="min-w-[280px] flex-[1_1_560px]">
      <Link
        href={`/article/${a.slug}`}
        className="group border-rule-soft bg-paper-4 hover:border-rule-strong block overflow-hidden rounded-[10px] border shadow-[0_1px_2px_rgba(11,26,61,0.05)] transition-all hover:shadow-[0_10px_28px_rgba(11,26,61,0.10)]"
      >
        {/* Flush to the card's top edge — the card clips the corners, so the
            thumb draws no border of its own. */}
        <Thumb
          src={a.image}
          alt={a.title}
          priority
          bordered={false}
          sizes="(max-width: 900px) 100vw, 620px"
          className="h-[340px] w-full"
        />
        <div className="p-5 sm:p-7">
          <div className="text-brand-accent mb-2 text-[13px]">{a.kicker || a.categoryName}</div>
          <h2 className="font-heading text-heading-ink group-hover:text-brand mb-3 text-[38px] leading-[1.5] text-pretty transition-colors">
            {a.title}
          </h2>
          <p className="mb-3 text-justify text-[17px] leading-[2.1] text-[#3C5077] text-pretty">
            {a.excerpt}
          </p>
          <div className="text-faint-ink flex flex-wrap items-center gap-2.5 text-[12.5px] leading-[1.9]">
            <span>{a.author}</span>
            {dot}
            <span>{timeAgo(a.publishedAt)}</span>
          </div>
        </div>
      </Link>
    </article>
  );
}

/** Compact row with a small thumb — used in the sidebar rails. */
export function RowCard({
  a,
  thumbClass = "h-20 w-[106px]",
  showKicker = true,
}: {
  a: ArticleWithCategory;
  thumbClass?: string;
  showKicker?: boolean;
}) {
  return (
    <article>
      <Link
        href={`/article/${a.slug}`}
        className="group border-rule-soft bg-paper-4 hover:border-rule-strong flex gap-3.5 rounded-[8px] border p-3 shadow-[0_1px_2px_rgba(11,26,61,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(11,26,61,0.09)]"
      >
        <Thumb
          src={a.image}
          alt=""
          sizes="120px"
          bordered={false}
          className={`flex-none rounded-[5px] ${thumbClass}`}
        />
        <div className="min-w-0">
          {showKicker && (
            <div className="text-brand-accent mb-1.5 text-[12px]">{a.kicker || a.categoryName}</div>
          )}
          <div className="font-sans text-heading-ink group-hover:text-brand text-[18px] leading-[1.75] font-semibold text-pretty transition-colors">
            {a.title}
          </div>
          <div className="text-faint-ink mt-1.5 text-[12px] leading-[1.8]">
            {timeAgo(a.publishedAt)}
          </div>
        </div>
      </Link>
    </article>
  );
}

/** Grid tile used in the category strips. */
export function GridCard({ a }: { a: ArticleWithCategory }) {
  return (
    <article>
      <Link href={`/article/${a.slug}`} className="group block">
        <Thumb
          src={a.image}
          alt=""
          sizes="(max-width: 768px) 100vw, 260px"
          className="mb-3 h-[150px] w-full"
        />
        <h3 className="font-sans text-heading-ink group-hover:text-brand mb-[7px] text-[19px] leading-[1.75] font-bold text-pretty transition-colors">
          {a.title}
        </h3>
        <div className="text-faint-ink flex gap-2 text-[12px] leading-[1.8]">
          <span>{timeAgo(a.publishedAt)}</span>
        </div>
      </Link>
    </article>
  );
}
