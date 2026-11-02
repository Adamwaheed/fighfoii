"use client";

import { useState } from "react";
import Link from "next/link";
import { CalculatorIcon, CoinsIcon, ExternalLinkIcon } from "lucide-react";

/**
 * Zakat nisab, shown on the front page.
 *
 * The figure is entered by hand in the admin panel rather than fetched: the
 * Ministry publishes it as prose on a web page, and a scraper for that would
 * break silently and leave a stale number looking current. Because a wrong
 * nisab has religious and financial consequences, the publication date is shown
 * next to it rather than tucked away — a reader can then judge for themselves
 * whether it is still the current ruling.
 *
 * The amount is stored as a number, so the same value can drive the calculator
 * instead of being re-typed as prose somewhere else.
 */
export function ZakatCard({
  amount,
  updated,
  note,
  source,
}: {
  /** null when no figure has been published yet. */
  amount: number | null;
  updated: string;
  note: string;
  source: string;
}) {
  const [open, setOpen] = useState(false);
  const [wealth, setWealth] = useState("");

  const money = (n: number) =>
    n.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const entered = Number(wealth.replace(/,/g, ""));
  const valid = wealth.trim() !== "" && Number.isFinite(entered) && entered >= 0;
  const due = amount !== null && valid && entered >= amount;

  return (
    <section className="overflow-hidden rounded-[10px] border border-[#D8B24A]/35 bg-gradient-to-b from-[#FBF3DE] to-[#FDFAF2] dark:border-[#D8B24A]/25 dark:from-[#2A2413] dark:to-[#1E1A0E]">
      <div className="p-4">
        <div className="mb-2.5 flex items-center gap-2 text-[12px] leading-[1.8] text-[#8A6B1F] dark:text-[#D8B24A]">
          <CoinsIcon className="size-4" aria-hidden />
          ޒަކާތުގެ ނިޞާބު
        </div>

        {/* Without a published figure the card still offers the calculator —
            the arithmetic works regardless — but never invents a nisab. */}
        {amount === null ? (
          <p className="text-[14px] leading-[1.95] text-[#6B5518] text-pretty dark:text-[#C9B583]">
            ޒަކާތް ދައްކަވަންޖެހޭ މިންވަރު ހިސާބުކުރައްވާ
          </p>
        ) : (
          <div className="flex items-baseline gap-1.5">
            <span className="font-heading text-[34px] leading-[1.25] text-[#5C4610] tabular-nums dark:text-[#EBD79A]">
              {money(amount)}
            </span>
            <span className="text-[15px] leading-[1.6] text-[#8A6B1F] dark:text-[#D8B24A]">
              ރުފިޔާ
            </span>
          </div>
        )}

        {note && (
          <p className="mt-1.5 text-[13px] leading-[1.9] text-[#6B5518] text-pretty dark:text-[#C9B583]">
            {note}
          </p>
        )}

        <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] leading-[1.8] text-[#8A6B1F]/80 dark:text-[#D8B24A]/70">
          {updated && <span>އަޕްޑޭޓްކުރީ {updated}</span>}
          {source && (
            <a
              href={source}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 underline decoration-dotted underline-offset-2 transition-opacity hover:opacity-80"
            >
              މިނިސްޓްރީގެ އިޢުލާން
              <ExternalLinkIcon className="size-3" aria-hidden />
            </a>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 border-t border-[#D8B24A]/25 px-4 py-2.5 text-[13px] leading-[1.8] text-[#8A6B1F] transition-colors hover:bg-[#D8B24A]/10 dark:text-[#D8B24A]"
      >
        <CalculatorIcon className="size-4" aria-hidden />
        ޒަކާތް ހިސާބުކުރައްވާ
      </button>

      {open && (
        <div className="border-t border-[#D8B24A]/25 p-4">
          <label
            htmlFor="zakat-wealth"
            className="mb-1.5 block text-[12.5px] leading-[1.8] text-[#6B5518] dark:text-[#D8B24A]"
          >
            އަހަރު ފުރިހަމަވި މުދަލުގެ ޖުމުލަ (ރުފިޔާ)
          </label>

          <input
            id="zakat-wealth"
            inputMode="decimal"
            dir="ltr"
            value={wealth}
            onChange={(e) => setWealth(e.target.value.replace(/[^\d.,]/g, ""))}
            placeholder="0.00"
            className="min-h-11 w-full rounded-[5px] border border-[#D8B24A]/40 bg-white/60 px-3 text-start text-[15px] tabular-nums outline-none focus:border-[#B8912F] dark:bg-black/20 dark:text-[#EBD79A]"
          />

          {valid && amount === null && (
            <p className="mt-3 text-[13.5px] leading-[1.95] text-[#8A6B1F] dark:text-[#D8B24A]">
              ޒަކާތް (2.5%):{" "}
              <span className="font-heading text-[19px] tabular-nums">
                {money(entered * 0.025)}
              </span>{" "}
              ރުފިޔާ
            </p>
          )}

          {valid && amount !== null && (
            <div className="mt-3 text-[13.5px] leading-[1.95]">
              {due ? (
                <>
                  <p className="text-[#5C4610] dark:text-[#EBD79A]">
                    ނިޞާބަށްވުރެ މަތި — ޒަކާތް ވާޖިބު
                  </p>
                  <p className="mt-1 text-[#8A6B1F] dark:text-[#D8B24A]">
                    ދައްކަވަންޖެހޭ ޒަކާތް (2.5%):{" "}
                    <span className="font-heading text-[19px] tabular-nums">
                      {money(entered * 0.025)}
                    </span>{" "}
                    ރުފިޔާ
                  </p>
                </>
              ) : (
                <p className="text-[#6B5518] dark:text-[#D8B24A]">
                  ނިޞާބަށްވުރެ ދަށް — ޒަކާތް ވާޖިބެއް ނުވާނެ
                </p>
              )}
            </div>
          )}

          <Link
            href="/zakat"
            className="mt-3 inline-block text-[12.5px] leading-[1.85] text-[#8A6B1F] underline decoration-dotted underline-offset-2 transition-opacity hover:opacity-80 dark:text-[#D8B24A]"
          >
            ބޭންކް ސްޓޭޓްމަންޓުން ބެއްލެވުމަށް →
          </Link>

          <p className="mt-3 text-[11.5px] leading-[1.85] text-[#8A6B1F]/75 dark:text-[#D8B24A]/60">
            މިއީ ހަމައެކަނި ފަސޭހަކުރުމަށް ކުރެވޭ ހިސާބެކެވެ. ޔަޤީންކުރެއްވުމަށް ޢިލްމުވެރިއަކާ
            މަޝްވަރާކުރައްވާ.
          </p>
        </div>
      )}
    </section>
  );
}
