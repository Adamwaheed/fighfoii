"use client";

import { useState } from "react";
import { Loader2Icon, SendIcon } from "lucide-react";
import { submitQuestion } from "@/lib/feedback-actions";

/**
 * Question form.
 *
 * The Viber number is required because that is where the answer goes — the
 * field says so, rather than leaving the reader to wonder why a phone number
 * is being asked for.
 */
export function QuestionForm() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (sent) {
    return (
      <div className="border-rule-soft bg-paper-4 rounded-[10px] border p-8 text-center">
        <h2 className="font-heading text-heading-ink mb-2 text-[22px] leading-[1.6]">
          ސުވާލު ލިބިއްޖެ
        </h2>
        <p className="text-muted-ink text-[14.5px] leading-[2]">
          ޖަވާބު ފޮނުވޭނީ ތިޔަ ބޭފުޅާ ދެއްވި ވައިބަރ ނަންބަރަށެވެ.
        </p>
      </div>
    );
  }

  return (
    <form
      className="border-rule-soft bg-paper-4 grid gap-4 rounded-[10px] border p-5"
      action={async (fd) => {
        setBusy(true);
        setError("");
        const res = await submitQuestion(fd);
        setBusy(false);
        if (res.error) setError(res.error);
        else setSent(true);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <label htmlFor="q-name" className="text-muted-ink text-[13px] leading-[1.8]">
            ނަން (ބޭނުމިއްޔާ)
          </label>
          <input
            id="q-name"
            name="name"
            dir="rtl"
            maxLength={120}
            className="border-rule focus:border-brand text-ink min-h-11 rounded-[5px] border bg-transparent px-3 text-[14.5px] outline-none"
          />
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="q-viber" className="text-muted-ink text-[13px] leading-[1.8]">
            ވައިބަރ ނަންބަރު <span className="text-[#C0392B]">*</span>
          </label>
          <input
            id="q-viber"
            name="viber"
            dir="ltr"
            inputMode="tel"
            required
            placeholder="7XXXXXX"
            maxLength={20}
            className="border-rule focus:border-brand text-ink min-h-11 rounded-[5px] border bg-transparent px-3 text-start text-[14.5px] outline-none"
          />
        </div>
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="q-body" className="text-muted-ink text-[13px] leading-[1.8]">
          ސުވާލު <span className="text-[#C0392B]">*</span>
        </label>
        <textarea
          id="q-body"
          name="body"
          dir="rtl"
          rows={6}
          required
          maxLength={4000}
          placeholder="ސުވާލު ތަފްޞީލުކޮށް ލިޔުއްވާ…"
          className="border-rule focus:border-brand text-ink rounded-[5px] border bg-transparent p-3 text-[15px] leading-[2] outline-none"
        />
      </div>

      {/* Honeypot */}
      <input
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="pointer-events-none absolute -left-[9999px] size-0 opacity-0"
      />

      {error && <p className="text-[13.5px] leading-[1.8] text-[#C0392B]">{error}</p>}

      <div>
        <button
          type="submit"
          disabled={busy}
          className="border-brand bg-brand text-paper hover:bg-brand-deep hover:border-brand-deep inline-flex min-h-11 items-center gap-2 rounded-[5px] border px-6 text-[15px] leading-[1.7] transition-colors disabled:opacity-60"
        >
          {busy ? (
            <Loader2Icon className="size-4 animate-spin" aria-hidden />
          ) : (
            <SendIcon className="size-4" aria-hidden />
          )}
          ފޮނުއްވާ
        </button>
      </div>
    </form>
  );
}
