"use client";

import { useActionState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { clearGeminiKey, saveGeminiKey, testGeminiKey, type KeyFormState } from "@/lib/actions";
import { AlertCircleIcon, CheckCircle2Icon, KeyRoundIcon, LoaderCircleIcon } from "lucide-react";

const initial: KeyFormState = { error: null, ok: null };

export function GeminiSettings({
  source,
  masked,
  model,
  defaultModel,
}: {
  source: "env" | "admin" | "none";
  masked: string;
  model: string;
  defaultModel: string;
}) {
  const [state, action, saving] = useActionState(saveGeminiKey, initial);
  const [pending, start] = useTransition();

  const badge =
    source === "none" ? (
      <Badge variant="outline">ސެޓުކުރައްވާފައި ނެތް</Badge>
    ) : (
      <Badge>{source === "env" ? "މާޙައުލުން" : "ޕެނަލުން"}</Badge>
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading flex items-center gap-2 text-xl">
          <KeyRoundIcon className="size-4" />
          Gemini
        </CardTitle>
        <CardDescription>
          ފޮތް ތަރުޖަމާކުރެއްވުމަށް ބޭނުންވާ ކީ. ރައްކާކުރެވެނީ އެންކްރިޕްޓްކޮށެވެ.
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-4">
        <div className="border-rule flex flex-wrap items-center justify-between gap-2 border-b pb-3">
          <div className="flex items-center gap-2">
            <span className="text-muted-ink text-[13px]">ޙާލަތު</span>
            {badge}
          </div>
          {masked && (
            <span dir="ltr" className="text-muted-ink font-mono text-[13px]">
              {masked}
            </span>
          )}
        </div>

        {source === "env" && (
          <p className="text-muted-ink flex items-start gap-2 border border-[#E4D8B8] bg-[#FBF6E7] px-3 py-2.5 text-[13px] leading-[1.9]">
            <AlertCircleIcon className="text-brand-accent mt-1 size-4 flex-none" />
            <span>
              <code className="font-mono text-[12px]">GEMINI_API_KEY</code> މާޙައުލުގައި
              ސެޓުކުރެވިފައިވާތީ، މިތަނުން ސެޓުކުރާ ކީއަށްވުރެ އިސްކަން ދެވޭނީ އެއަށެވެ.
            </span>
          </p>
        )}

        <form action={action} className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="key" className="text-muted-ink text-[13px]">
              API ކީ
            </Label>
            <Input
              id="key"
              name="key"
              type="password"
              dir="ltr"
              autoComplete="off"
              placeholder={masked ? "އައު ކީއެއް ލިޔުއްވާ…" : "AIza…"}
              className="text-start font-mono text-[13px]"
            />
            <p className="text-faint-ink text-[12px] leading-[1.7]">
              ރައްކާކުރެއްވުމުގެ ކުރިން ކީ ބަލައި ޗެކްކުރެވޭނެއެވެ.
            </p>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="model" className="text-muted-ink text-[13px]">
              މޮޑެލް
            </Label>
            <Input
              id="model"
              name="model"
              dir="ltr"
              defaultValue={model}
              placeholder={defaultModel}
              className="text-start font-mono text-[13px]"
            />
          </div>

          {state.error && (
            <p role="alert" className="text-destructive flex items-start gap-2 text-[13px] leading-[1.8]">
              <AlertCircleIcon className="mt-0.5 size-4 flex-none" />
              {state.error}
            </p>
          )}
          {state.ok && (
            <p className="text-brand flex items-start gap-2 text-[13px] leading-[1.8]">
              <CheckCircle2Icon className="mt-0.5 size-4 flex-none" />
              {state.ok}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={saving}>
              {saving && <LoaderCircleIcon className="animate-spin" />}
              ރައްކާކުރައްވާ
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={pending || source === "none"}
              onClick={() =>
                start(async () => {
                  const res = await testGeminiKey();
                  if (res.error) toast.error(res.error);
                  else toast.success(res.ok ?? "ok");
                })
              }
            >
              ޓެސްޓްކުރައްވާ
            </Button>

            {source === "admin" && (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const res = await clearGeminiKey();
                    if (res?.error) toast.error(res.error);
                    else toast.success("ކީ ފޮހެލެވިއްޖެ");
                  })
                }
              >
                ފޮހެލާ
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
