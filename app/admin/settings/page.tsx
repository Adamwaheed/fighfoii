import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { savePublicSettings, saveSettings } from "@/lib/actions";
import { Textarea } from "@/components/ui/textarea";
import { getSettings } from "@/lib/queries";
import { requireUser } from "@/lib/auth";
import { GeminiSettings } from "@/components/admin/gemini-settings";
import {
  DEFAULT_MODEL,
  geminiKeySource,
  getGeminiKey,
  getGeminiModel,
} from "@/lib/gemini";
import { maskSecret } from "@/lib/secrets";
import { MailSettings } from "@/components/admin/mail-settings";
import { getMailFrom, getMailKey, mailKeySource } from "@/lib/email";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const me = await requireUser();
  const settings = getSettings();

  return (
    <div className="mx-auto grid w-full max-w-xl gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl">ސެޓިންގްސް</CardTitle>
          <CardDescription>ވެބްސައިޓުގެ ނަމާއި ތަޢާރަފު.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={saveSettings} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label className="text-muted-ink text-[13px]">ވެބްސައިޓުގެ ނަން</Label>
              <Input
                dir="rtl"
                name="site_title"
                defaultValue={settings.site_title ?? ""}
                className="font-heading h-auto py-2.5 text-[22px]"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-muted-ink text-[13px]">ތަޢާރަފު</Label>
              <Input dir="rtl" name="site_tagline" defaultValue={settings.site_tagline ?? ""} />
            </div>
            <Button type="submit" className="justify-self-start">
              ރައްކާކުރައްވާ
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl">ގުޅުއްވުމާއި ޗެނަލް</CardTitle>
          <CardDescription>
            ތަޢާރަފު ޞަފުޙާގައްޔާއި ފުޓަރގައި ދައްކާ މަޢުލޫމާތު
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={savePublicSettings} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="contact_email">އީމެއިލް</Label>
              <Input
                id="contact_email"
                name="contact_email"
                type="email"
                dir="ltr"
                className="text-start"
                defaultValue={settings.contact_email ?? ""}
                placeholder="info@fiqhfoiy.com"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="telegram_channel">ޓެލެގްރާމް ޗެނަލް</Label>
              <Input
                id="telegram_channel"
                name="telegram_channel"
                dir="ltr"
                className="text-start"
                defaultValue={settings.telegram_channel ?? ""}
                placeholder="fiqhfoiy"
              />
              <p className="text-faint-ink text-[12px] leading-[1.7]">
                @ އަކާ ނުލައި ލިޔުއްވާ
              </p>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="about_text">ތަޢާރަފު</Label>
              <Textarea
                id="about_text"
                name="about_text"
                dir="rtl"
                rows={5}
                defaultValue={settings.about_text ?? ""}
              />
            </div>

            <div className="border-rule grid gap-4 border-t pt-4">
              <div>
                <Label className="text-[15px]">ޒަކާތުގެ ނިޞާބު</Label>
                <p className="text-faint-ink mt-0.5 text-[12px] leading-[1.7]">
                  މިނިސްޓްރީން ޢާންމުކުރައްވާ މިންވަރު އަތުން ލިޔުއްވާ. ހުސްކޮށް ބެހެއްޓެވުމުން
                  ފުރަތަމަ ޞަފުޙާގައި ނުދެއްކޭނެ.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="zakat_amount">މިންވަރު (ރުފިޔާ)</Label>
                  <Input
                    id="zakat_amount"
                    name="zakat_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    dir="ltr"
                    className="text-start"
                    defaultValue={settings.zakat_amount ?? ""}
                    placeholder="8050"
                  />
                  <p className="text-faint-ink text-[12px] leading-[1.7]">
                    ޢަދަދު އެކަނި. ހިސާބުކުރާ ފީޗަރ ބޭނުންކުރަނީ މި ޢަދަދު.
                  </p>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="zakat_updated">ޢާންމުކުރެއްވި ތާރީޚު</Label>
                  <Input
                    id="zakat_updated"
                    name="zakat_updated"
                    type="date"
                    dir="ltr"
                    className="text-start"
                    defaultValue={settings.zakat_updated ?? ""}
                  />
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="zakat_note">ނޯޓު</Label>
                <Input
                  id="zakat_note"
                  name="zakat_note"
                  dir="rtl"
                  defaultValue={settings.zakat_note ?? ""}
                  placeholder="މާލެ ސިޓީ"
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="zakat_source">މަޞްދަރު ލިންކު</Label>
                <Input
                  id="zakat_source"
                  name="zakat_source"
                  type="url"
                  dir="ltr"
                  className="text-start"
                  defaultValue={settings.zakat_source ?? ""}
                  placeholder="https://…"
                />
              </div>
            </div>

            <div className="border-rule grid gap-1.5 border-t pt-4">
              <Label htmlFor="bank_details">ފިހާރައިގެ ބޭންކް އެކައުންޓު</Label>
              <Textarea
                id="bank_details"
                name="bank_details"
                dir="rtl"
                rows={3}
                defaultValue={settings.bank_details ?? ""}
                placeholder="އެކައުންޓު ނަން / ނަންބަރު…"
              />
              <p className="text-faint-ink text-[12px] leading-[1.7]">
                ފޮތެއް ގަންނަވާ ޞަފުޙާގައި ދައްކާނެ
              </p>
            </div>

            <Button type="submit" className="justify-self-start">
              ރައްކާކުރައްވާ
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Integration credentials are admin-only; editors never see the key. */}
      {me.role === "admin" && (
        <MailSettings source={mailKeySource()} masked={maskSecret(getMailKey())} from={getMailFrom()} />
      )}

      {me.role === "admin" && (
        <GeminiSettings
          source={geminiKeySource()}
          masked={maskSecret(getGeminiKey())}
          model={getGeminiModel()}
          defaultModel={DEFAULT_MODEL}
        />
      )}
    </div>
  );
}
