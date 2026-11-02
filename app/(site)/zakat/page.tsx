import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/site-header";
import { ZakatCalculator } from "@/components/site/zakat-calculator";
import { getSettings } from "@/lib/queries";

export const metadata: Metadata = {
  title: "ޒަކާތް ހިސާބުކުރައްވާ",
  description: "ޒަކާތުގެ ނިޞާބާއި، ދައްކަވަންޖެހޭ ޒަކާތުގެ މިންވަރު",
};

export const dynamic = "force-dynamic";

export default function ZakatPage() {
  const settings = getSettings();
  const nisab = Number(settings.zakat_amount ?? "");

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[720px] px-5 pt-8 pb-[90px]">
        <h1 className="font-heading text-heading-ink mb-2 text-[32px] leading-[1.5]">
          ޒަކާތް ހިސާބުކުރައްވާ
        </h1>

        <p className="text-muted-ink mb-7 text-[15px] leading-[2]">
          {settings.zakat_updated
            ? `ނިޞާބުގެ މިންވަރު އަޕްޑޭޓްކުރެވިފައިވަނީ ${settings.zakat_updated} ގައެވެ.`
            : "މުދަލުގެ ޒަކާތް ވާޖިބުވަނީ ނިޞާބަށްވުރެ މަތިވެ، އަހަރު ފުރިހަމަވުމުންނެވެ."}
        </p>

        <ZakatCalculator nisab={Number.isFinite(nisab) ? nisab : 0} />
      </main>
    </>
  );
}
