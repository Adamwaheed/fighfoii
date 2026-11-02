import Link from "next/link";
import { SiteHeader } from "@/components/site/site-header";
import { TelegramCard } from "@/components/site/home-widgets";
import { ZakatCard } from "@/components/site/zakat-card";
import { getSettings } from "@/lib/queries";
import { SideTabs } from "@/components/site/side-tabs";
import { GridCard, LeadCard, RowCard } from "@/components/site/article-cards";
import { Thumb } from "@/components/site/thumb";
import {
  getByPlacement,
  getRecentPerCategory,
  getPopular,
  getPublished,
  getSections,
} from "@/lib/queries";
import { timeAgo } from "@/lib/utils-format";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const latest = getPublished(12);
  const lead = getByPlacement("lead", 1)[0] ?? latest[0];
  // Derived from publish dates rather than a manual placement, so this always
  // shows current work without anyone remembering to re-assign it.
  const secondary = getRecentPerCategory(3, lead ? [lead.id] : []);
  const picks = getByPlacement("pick", 3);
  const popular = getPopular(5);
  const sections = getSections(3);
  const settings = getSettings();
  const zakat = Number(settings.zakat_amount ?? "");

  // Whatever is not already in the hero fills the card strip below it.
  const featuredIds = new Set([lead?.id, ...secondary.map((a) => a.id)]);
  const cards = latest.filter((a) => !featuredIds.has(a.id)).slice(0, 4);
  const [pickLead, ...pickRows] = picks;

  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-[1200px] px-5 pb-[70px]">
        {/* Hero */}
        {lead && (
          <div className="border-rule flex flex-wrap gap-8 border-b pt-6 pb-[26px]">
            <LeadCard a={lead} />
            <div className="grid min-w-[260px] flex-[1_1_300px] content-start gap-[18px]">
              {secondary.map((a) => (
                <RowCard key={a.id} a={a} />
              ))}

              <ZakatCard
                amount={zakat > 0 ? zakat : null}
                updated={settings.zakat_updated ?? ""}
                note={settings.zakat_note ?? ""}
                source={settings.zakat_source ?? ""}
              />
              <TelegramCard channel={settings.telegram_channel ?? ""} />
            </div>
          </div>
        )}

        {/* Card strip */}
        {cards.length > 0 && (
          <div className="border-rule grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-7 border-b py-[26px]">
            {cards.map((a) => (
              <GridCard key={a.id} a={a} />
            ))}
          </div>
        )}

        {/* Editor's picks + latest/popular rail */}
        <div className="border-rule flex flex-wrap gap-8 border-b py-7">
          <div className="min-w-[280px] flex-[1_1_540px]">
            <h2 className="font-heading text-heading-ink border-brand-accent mb-[18px] inline-block border-b-2 pb-2 text-[26px] leading-[1.5]">
              އެޑިޓަރުގެ ހޮވުން
            </h2>

            {pickLead && (
              <article className="mb-[22px]">
                <Link href={`/article/${pickLead.slug}`} className="group flex flex-wrap gap-5">
                  <Thumb
                    src={pickLead.image}
                    alt=""
                    sizes="(max-width: 768px) 100vw, 300px"
                    className="h-[180px] min-w-[200px] flex-[1_1_240px]"
                  />
                  <div className="min-w-[200px] flex-[1_1_230px]">
                    <div className="text-brand-accent mb-[7px] text-[12px]">
                      {pickLead.kicker || pickLead.categoryName}
                    </div>
                    <h3 className="font-heading text-heading-ink group-hover:text-brand mb-[9px] text-[24px] leading-[1.55] text-pretty transition-colors">
                      {pickLead.title}
                    </h3>
                    <p className="mb-2 text-[15px] leading-[1.95] text-[#4A5E85] text-pretty">
                      {pickLead.excerpt}
                    </p>
                    <div className="text-faint-ink text-[12px] leading-[1.8]">
                      {timeAgo(pickLead.publishedAt)}
                    </div>
                  </div>
                </Link>
              </article>
            )}

            {pickRows.map((a) => (
              <div key={a.id} className="border-rule-soft border-t pt-3.5">
                <RowCard a={a} thumbClass="h-[72px] w-24" />
              </div>
            ))}
          </div>

          <SideTabs latest={latest.slice(0, 5)} popular={popular} />
        </div>

        {/* Per-category sections */}
        {sections.map(({ category, items }) => (
          <section key={category.id} className="border-rule border-b py-[26px]">
            <div className="mb-[18px] flex items-baseline justify-between gap-3">
              <Link href={`/category/${category.slug}`}>
                <h2 className="font-heading text-heading-ink hover:text-brand border-brand-accent border-b-2 pb-1.5 text-[26px] leading-[1.5] transition-colors">
                  {category.name}
                </h2>
              </Link>
              <Link
                href={`/category/${category.slug}`}
                className="text-brand hover:text-brand-accent text-[13.5px] leading-[1.8] transition-colors"
              >
                އިތުރަށް ←
              </Link>
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-[26px]">
              {items.map((a) => (
                <GridCard key={a.id} a={a} />
              ))}
            </div>
          </section>
        ))}
      </main>
    </>
  );
}
