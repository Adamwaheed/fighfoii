import type { Metadata } from "next";
import Link from "next/link";
import { MailIcon, SendIcon, MessageSquareIcon } from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { getSettings } from "@/lib/queries";

export const metadata: Metadata = {
  title: "ތަޢާރަފު",
  description: "ފިޤުހު ފޮއި އާ ބެހޭގޮތުން، އަދި މައްސަލައެއް ރިޕޯޓުކުރެއްވުމަށް",
};

export const dynamic = "force-dynamic";

export default function AboutPage() {
  const s = getSettings();
  const email = s.contact_email ?? "";
  const telegram = (s.telegram_channel ?? "").replace(/^@/, "");
  const intro = s.about_text ?? "";

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[720px] px-5 pt-8 pb-[90px]">
        <h1 className="font-heading text-heading-ink mb-5 text-[32px] leading-[1.5]">
          ތަޢާރަފު
        </h1>

        {intro ? (
          <div className="text-article-ink mb-9 text-[16px] leading-[2.1] whitespace-pre-wrap">
            {intro}
          </div>
        ) : (
          <p className="text-article-ink mb-9 text-[16px] leading-[2.1]">
            ފިޤުހު ފޮއި އަކީ ދިވެހި ބަހުން ދީނީ ޢިލްމީ ލިޔުންތަކާއި ފޮތްތައް ފޯރުކޮށްދޭ ވެބްސައިޓެކެވެ.
          </p>
        )}

        <h2 className="font-heading text-heading-ink mb-3 text-[22px] leading-[1.55]">
          މައްސަލައެއް ރިޕޯޓުކުރެއްވުމަށް
        </h2>
        <p className="text-muted-ink mb-4 text-[14.5px] leading-[2]">
          ވެބްސައިޓުގައި މައްސަލައެއް ނުވަތަ ކުށެއް ފެނިވަޑައިގެންފިނަމަ އަންގަވާލައްވާ.
        </p>

        <div className="grid gap-2.5 sm:grid-cols-2">
          {email && (
            <a
              href={`mailto:${email}?subject=${encodeURIComponent("ފިޤުހު ފޮއި — މައްސަލައެއް")}`}
              className="border-rule-soft bg-paper-4 hover:border-rule-strong flex items-center gap-3 rounded-[8px] border p-4 transition-colors"
            >
              <MailIcon className="text-brand size-5 flex-none" aria-hidden />
              <span className="min-w-0">
                <span className="text-heading-ink block text-[14.5px] leading-[1.7]">
                  އީމެއިލް
                </span>
                <span className="text-muted-ink block truncate text-[13px]" dir="ltr">
                  {email}
                </span>
              </span>
            </a>
          )}

          {telegram && (
            <a
              href={`https://t.me/${telegram}`}
              target="_blank"
              rel="noopener noreferrer"
              className="border-rule-soft bg-paper-4 hover:border-rule-strong flex items-center gap-3 rounded-[8px] border p-4 transition-colors"
            >
              <SendIcon className="size-5 flex-none text-[#229ED9]" aria-hidden />
              <span className="min-w-0">
                <span className="text-heading-ink block text-[14.5px] leading-[1.7]">
                  ޓެލެގްރާމް
                </span>
                <span className="text-muted-ink block truncate text-[13px]" dir="ltr">
                  @{telegram}
                </span>
              </span>
            </a>
          )}
        </div>

        {!email && !telegram && (
          <p className="text-faint-ink border-rule-soft rounded-[8px] border border-dashed p-5 text-center text-[13.5px] leading-[1.9]">
            ގުޅުއްވާނެ ގޮތް އަދި ސެޓުކުރައްވާފައި ނެތެވެ
          </p>
        )}

        <div className="border-rule-soft mt-8 border-t pt-6">
          <Link
            href="/ask"
            className="text-brand hover:text-brand-deep inline-flex items-center gap-2 text-[15px] leading-[1.8] transition-colors"
          >
            <MessageSquareIcon className="size-4" aria-hidden />
            ދީނީ ސުވާލެއް ފޮނުއްވުމަށް
          </Link>
        </div>
      </main>
    </>
  );
}
