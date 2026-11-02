"use client";

import { useState } from "react";
import { Loader2Icon, UploadIcon, CheckCircle2Icon } from "lucide-react";
import { placeOrder } from "@/lib/store-actions";

/**
 * Checkout.
 *
 * There is no payment gateway and no reader account: the buyer transfers the
 * money themselves, uploads the slip, and an editor releases the file. So the
 * form's job is to be unambiguous about that sequence — the reader should not
 * be left wondering whether anything happened after they upload.
 */
export function CheckoutForm({
  productId,
  bankDetails,
}: {
  productId: number;
  bankDetails: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [fileName, setFileName] = useState("");

  if (done) {
    return (
      <div className="rounded-[10px] border border-[#1F9D55]/30 bg-[#1F9D55]/5 p-8 text-center">
        <CheckCircle2Icon className="mx-auto mb-3 size-8 text-[#1F9D55]" aria-hidden />
        <h2 className="font-heading text-heading-ink mb-2 text-[22px] leading-[1.6]">
          އޯޑަރު ލިބިއްޖެ
        </h2>
        <p className="text-muted-ink text-[14.5px] leading-[2]">
          ސްލިޕް ބެއްލެވުމަށްފަހު، ފޮތް ޑައުންލޯޑްކުރެއްވޭނެ ލިންކެއް އީމެއިލްއިން ފޮނުވޭނެއެވެ.
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
        fd.set("productId", String(productId));
        const res = await placeOrder(fd);
        setBusy(false);
        if (res.ok) setDone(true);
        else setError(res.error ?? "ނުކުރެވުނު");
      }}
    >
      <h2 className="font-heading text-heading-ink text-[20px] leading-[1.6]">
        ގަންނަވާ
      </h2>

      {bankDetails && (
        <div className="border-rule-soft rounded-[6px] border border-dashed p-3.5">
          <div className="text-faint-ink mb-1.5 text-[12px] leading-[1.8]">
            ފައިސާ ޓްރާންސްފަރކުރައްވާނެ އެކައުންޓު
          </div>
          <div className="text-ink text-[14px] leading-[2] whitespace-pre-wrap">
            {bankDetails}
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <label htmlFor="c-name" className="text-muted-ink text-[13px] leading-[1.8]">
            ނަން
          </label>
          <input
            id="c-name"
            name="name"
            dir="rtl"
            maxLength={120}
            className="border-rule focus:border-brand text-ink min-h-11 rounded-[5px] border bg-transparent px-3 text-[14.5px] outline-none"
          />
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="c-phone" className="text-muted-ink text-[13px] leading-[1.8]">
            ފޯނު
          </label>
          <input
            id="c-phone"
            name="phone"
            dir="ltr"
            inputMode="tel"
            maxLength={40}
            className="border-rule focus:border-brand text-ink min-h-11 rounded-[5px] border bg-transparent px-3 text-start text-[14.5px] outline-none"
          />
        </div>
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="c-email" className="text-muted-ink text-[13px] leading-[1.8]">
          އީމެއިލް <span className="text-[#C0392B]">*</span>
        </label>
        <input
          id="c-email"
          name="email"
          type="email"
          dir="ltr"
          required
          maxLength={160}
          className="border-rule focus:border-brand text-ink min-h-11 rounded-[5px] border bg-transparent px-3 text-start text-[14.5px] outline-none"
        />
        <p className="text-faint-ink text-[12px] leading-[1.8]">
          ފޮތް ފޮނުވޭނީ މި އީމެއިލްއަށެވެ
        </p>
      </div>

      <div className="grid gap-1.5">
        <span className="text-muted-ink text-[13px] leading-[1.8]">
          ފައިސާ ދެއްކި ސްލިޕް <span className="text-[#C0392B]">*</span>
        </span>

        <label
          htmlFor="c-slip"
          className="border-rule hover:border-brand text-muted-ink flex min-h-11 cursor-pointer items-center gap-2 rounded-[5px] border border-dashed px-3 py-2.5 text-[14px] leading-[1.8] transition-colors"
        >
          <UploadIcon className="size-4 flex-none" aria-hidden />
          <span className="min-w-0 truncate">
            {fileName || "ފޮޓޯއެއް ނުވަތަ PDF ހޮއްވަވާ"}
          </span>
        </label>

        <input
          id="c-slip"
          name="slip"
          type="file"
          required
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
          className="sr-only"
        />
        <p className="text-faint-ink text-[12px] leading-[1.8]">6MB އަށްވުރެ ކުޑަ</p>
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
          {busy && <Loader2Icon className="size-4 animate-spin" aria-hidden />}
          ފޮނުއްވާ
        </button>
      </div>
    </form>
  );
}
