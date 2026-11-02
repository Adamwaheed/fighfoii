"use client";

import { useState } from "react";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  FileTextIcon,
  Loader2Icon,
  ShieldAlertIcon,
  UploadIcon,
} from "lucide-react";

/**
 * Zakat calculator.
 *
 * Two ways in: type the figure, or upload a statement and have the closing
 * balance read out of it. Typing comes first and involves no third party — the
 * upload is an accelerator, gated behind an explicit consent tick, because it
 * means sending a bank statement to Google's API and a reader deserves to
 * choose that knowingly rather than discover it afterwards.
 *
 * The result is arithmetic, not a ruling: the figure is editable and the page
 * says to confirm with a scholar.
 */

interface Reading {
  closingBalance: number | null;
  currency: string;
  periodFrom: string;
  periodTo: string;
  notes: string;
  error?: string;
}

const money = (n: number) =>
  n.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function ZakatCalculator({ nisab }: { nisab: number }) {
  const [wealth, setWealth] = useState("");
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState<Reading | null>(null);
  const [error, setError] = useState("");
  const [consented, setConsented] = useState(false);

  const entered = Number(wealth.replace(/,/g, ""));
  const valid = wealth.trim() !== "" && Number.isFinite(entered) && entered >= 0;
  const due = valid && nisab > 0 && entered >= nisab;

  const upload = async (file: File) => {
    setBusy(true);
    setError("");
    setReading(null);
    try {
      const fd = new FormData();
      fd.set("statement", file);
      const res = await fetch("/api/zakat", { method: "POST", body: fd });
      const data = (await res.json()) as Reading;
      if (!res.ok) throw new Error(data.error ?? "ނުކިޔުނު");
      setReading(data);

      if (data.closingBalance !== null) setWealth(String(data.closingBalance));
    } catch (err) {
      setError(err instanceof Error ? err.message : "ނުކިޔުނު");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6">
      {/* ── Manual entry, the primary path ── */}
      <section className="border-rule-soft bg-paper-4 rounded-[10px] border p-5">
        <label
          htmlFor="wealth"
          className="text-heading-ink mb-2 block text-[16px] leading-[1.8]"
        >
          އަހަރު ފުރިހަމަވި މުދަލުގެ ޖުމުލަ
        </label>

        <div className="flex items-center gap-2">
          <input
            id="wealth"
            inputMode="decimal"
            dir="ltr"
            value={wealth}
            onChange={(e) => setWealth(e.target.value.replace(/[^\d.,]/g, ""))}
            placeholder="0.00"
            className="border-rule focus:border-brand text-ink min-h-12 flex-1 rounded-[6px] border bg-transparent px-3.5 text-start text-[19px] tabular-nums outline-none"
          />
          <span className="text-muted-ink flex-none text-[15px]">ރުފިޔާ</span>
        </div>

        {nisab > 0 ? (
          <p className="text-faint-ink mt-2 text-[12.5px] leading-[1.85]">
            ނިޞާބު: <span className="tabular-nums">{money(nisab)}</span> ރުފިޔާ
          </p>
        ) : (
          <p className="mt-2 text-[12.5px] leading-[1.85] text-[#B8860B]">
            ނިޞާބުގެ މިންވަރު އަދި ސެޓުކުރެވިފައި ނެތުމުން، ވާޖިބުތޯ ބުނެދެވެން ނެތެވެ
          </p>
        )}

        {/* The 2.5% is arithmetic and needs no nisab. Only the above/below
            verdict does, so without a published figure the sum still shows. */}
        {valid && nisab <= 0 && (
          <div className="border-rule-soft bg-paper-2 mt-4 rounded-[8px] border p-4">
            <p className="text-muted-ink text-[14px] leading-[1.9]">
              ޒަކާތް (2.5%):{" "}
              <span className="font-heading text-brand text-[24px] tabular-nums">
                {money(entered * 0.025)}
              </span>{" "}
              ރުފިޔާ
            </p>
            <p className="text-faint-ink mt-1.5 text-[12.5px] leading-[1.85]">
              ނިޞާބުގެ މިންވަރު ސެޓުކުރެވިފައި ނެތުމުން، ވާޖިބުތޯ ބުނެދެވެން ނެތެވެ
            </p>
          </div>
        )}

        {valid && nisab > 0 && (
          <div
            className={`mt-4 rounded-[8px] border p-4 ${
              due
                ? "border-[#1F9D55]/30 bg-[#1F9D55]/5"
                : "border-rule-soft bg-paper-2"
            }`}
          >
            {due ? (
              <>
                <p className="text-heading-ink mb-1.5 flex items-center gap-2 text-[15px] leading-[1.8]">
                  <CheckCircle2Icon className="size-4 text-[#1F9D55]" aria-hidden />
                  ނިޞާބަށްވުރެ މަތި — ޒަކާތް ވާޖިބު
                </p>
                <p className="text-muted-ink text-[14px] leading-[1.9]">
                  ދައްކަވަންޖެހޭ ޒަކާތް (2.5%):{" "}
                  <span className="font-heading text-brand text-[24px] tabular-nums">
                    {money(entered * 0.025)}
                  </span>{" "}
                  ރުފިޔާ
                </p>
              </>
            ) : (
              <p className="text-muted-ink text-[14.5px] leading-[1.9]">
                ނިޞާބަށްވުރެ ދަށް — ޒަކާތް ވާޖިބެއް ނުވާނެ
              </p>
            )}
          </div>
        )}
      </section>

      {/* ── Statement upload, opt-in ── */}
      <section className="border-rule-soft rounded-[10px] border p-5">
        <h2 className="text-heading-ink mb-1.5 flex items-center gap-2 text-[16px] leading-[1.8]">
          <FileTextIcon className="size-4" aria-hidden />
          ބޭންކް ސްޓޭޓްމަންޓުން ބައްލަވާ
        </h2>
        <p className="text-muted-ink mb-4 text-[13.5px] leading-[1.95]">
          ސްޓޭޓްމަންޓް އަޕްލޯޑްކުރެއްވުމުން، ފަހު ބެލެންސް ކިޔައިދޭނެއެވެ.
        </p>

        {/* The reader is told what leaves their device before they can send it. */}
        <div className="mb-4 rounded-[8px] border border-[#B8860B]/30 bg-[#B8860B]/5 p-3.5">
          <p className="mb-2 flex items-start gap-2 text-[13px] leading-[1.9] text-[#8A6B1F]">
            <ShieldAlertIcon className="mt-0.5 size-4 flex-none" aria-hidden />
            <span>
              ސްޓޭޓްމަންޓް ކިޔުމަށް ފޮނުވެނީ Google ގެ AI ޚިދުމަތަށެވެ. ފައިލް މި
              ވެބްސައިޓުގައި ރައްކާނުކުރެވޭނެ، އަދި ބެލެންސް ފިޔަވައި އެހެން މަޢުލޫމާތެއް
              ނުނަގާނެއެވެ. ބޭނުންފުޅުނުވާނަމަ، މަތީގައި ޢަދަދު އަމިއްލައަށް ލިޔުއްވާ.
            </span>
          </p>

          <label className="flex cursor-pointer items-center gap-2 text-[13px] leading-[1.8] text-[#8A6B1F]">
            <input
              type="checkbox"
              checked={consented}
              onChange={(e) => setConsented(e.target.checked)}
              className="size-4 flex-none accent-[#B8860B]"
            />
            ގަބޫލުކުރައްވަން
          </label>
        </div>

        <label
          className={`flex min-h-12 items-center justify-center gap-2 rounded-[6px] border border-dashed px-4 text-[14px] leading-[1.8] transition-colors ${
            consented && !busy
              ? "border-rule hover:border-brand text-muted-ink cursor-pointer"
              : "border-rule-soft text-faint-ink cursor-not-allowed"
          }`}
        >
          {busy ? (
            <Loader2Icon className="size-4 animate-spin" aria-hidden />
          ) : (
            <UploadIcon className="size-4" aria-hidden />
          )}
          {busy ? "ކިޔަނީ…" : "PDF ނުވަތަ ފޮޓޯ ހޮއްވަވާ"}
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            disabled={!consented || busy}
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
              e.target.value = "";
            }}
          />
        </label>

        {error && (
          <p className="mt-3 flex items-center gap-2 text-[13.5px] leading-[1.85] text-[#C0392B]">
            <AlertTriangleIcon className="size-4 flex-none" aria-hidden />
            {error}
          </p>
        )}

        {reading && (
          <div className="border-rule-soft mt-4 grid gap-2.5 rounded-[8px] border p-4">
            <p className="text-faint-ink text-[12px] leading-[1.8]">
              ސްޓޭޓްމަންޓުން ފެނުނު ޢަދަދުތައް
              {reading.periodFrom && reading.periodTo && (
                <>
                  {" "}
                  ({reading.periodFrom} — {reading.periodTo})
                </>
              )}
            </p>

            <Figure
              label="ފަހު ބެލެންސް"
              value={reading.closingBalance}
              currency={reading.currency}
              onUse={(v) => setWealth(String(v))}
            />

            {/* The closing balance is a starting point, not the zakatable sum:
                zakat falls on wealth held for the year, which the reader knows
                and a single end-of-period figure does not show. */}
            <p className="text-[12.5px] leading-[1.85] text-[#B8860B]">
              މިއީ މުއްދަތު ނިމުނުއިރުގެ ބެލެންސެވެ. ޒަކާތް ވާޖިބުވަނީ އަހަރު ފުރިހަމަވި
              މުދަލަށް ކަމުން، ބޭނުންފުޅުނަމަ ޢަދަދު ބަދަލުކުރައްވާ.
            </p>

            {reading.currency && reading.currency !== "MVR" && (
              <p className="text-[12.5px] leading-[1.85] text-[#B8860B]">
                ސްޓޭޓްމަންޓް ހުރީ {reading.currency} އިންނެވެ. ނިޞާބު ބަލަނީ ރުފިޔާއިން
                ކަމުން، އަމިއްލައަށް ބަދަލުކުރައްވަންޖެހޭނެއެވެ.
              </p>
            )}

            {reading.notes && (
              <p className="text-faint-ink text-[12.5px] leading-[1.85]">{reading.notes}</p>
            )}
          </div>
        )}
      </section>

      <p className="text-faint-ink text-[12.5px] leading-[1.95]">
        މިއީ ހަމައެކަނި ފަސޭހަކުރުމަށް ކުރެވޭ ހިސާބެކެވެ. ޒަކާތް ވާޖިބުވަނީ އަހަރު
        ފުރިހަމަވުމުންނެވެ. ޔަޤީންކުރެއްވުމަށް ޢިލްމުވެރިއަކާ މަޝްވަރާކުރައްވާ.
      </p>
    </div>
  );
}

function Figure({
  label,
  value,
  currency,
  onUse,
}: {
  label: string;
  value: number | null;
  currency: string;
  onUse: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-ink text-[13.5px] leading-[1.85]">{label}</span>

      {value === null ? (
        <span className="text-faint-ink text-[13px]">ނުފެނުނު</span>
      ) : (
        <button
          type="button"
          onClick={() => onUse(value)}
          className="border-rule text-brand hover:border-brand hover:bg-brand/5 inline-flex min-h-9 items-center gap-1.5 rounded-[5px] border px-3 text-[14px] leading-[1.7] transition-colors"
        >
          <span className="tabular-nums">{money(value)}</span>
          <span className="text-faint-ink text-[11.5px]">{currency || "MVR"}</span>
        </button>
      )}
    </div>
  );
}
