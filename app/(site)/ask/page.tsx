import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/site-header";
import { QuestionForm } from "@/components/site/question-form";

export const metadata: Metadata = {
  title: "ސުވާލެއް ފޮނުއްވާ",
  description: "ދީނީ ސުވާލެއް ފޮނުއްވުމަށް",
};

export default function AskPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[720px] px-5 pt-8 pb-[90px]">
        <h1 className="font-heading text-heading-ink mb-2 text-[32px] leading-[1.5]">
          ސުވާލެއް ފޮނުއްވާ
        </h1>
        <p className="text-muted-ink mb-7 text-[15px] leading-[2]">
          ސުވާލު ފޮނުއްވުމުން ޖަވާބު ލިބޭނީ ތިޔަ ބޭފުޅާ ދެއްވާ ވައިބަރ ނަންބަރަށެވެ.
        </p>
        <QuestionForm />
      </main>
    </>
  );
}
