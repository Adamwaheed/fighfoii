"use client";

import { useState, useTransition } from "react";
import { CheckIcon, Loader2Icon, MailIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { saveMailKey } from "@/lib/store-actions";

/**
 * Resend credentials.
 *
 * The stored key is never sent back to the browser — only a mask of it — so
 * the field is left blank on load and an empty submit means "leave it alone".
 */
export function MailSettings({
  source,
  masked,
  from,
}: {
  source: "env" | "admin" | "none";
  masked: string;
  from: string;
}) {
  const [pending, start] = useTransition();
  const [key, setKey] = useState("");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MailIcon className="text-muted-ink size-4" aria-hidden />
          <CardTitle className="font-heading text-xl">އީމެއިލް (Resend)</CardTitle>
          {source !== "none" && (
            <Badge variant="secondary">{source === "env" ? "ސާވަރުން" : "ސެޓުކުރެވިފައި"}</Badge>
          )}
        </div>
        <CardDescription>
          ފިހާރައިން ފޮތް ފޮނުވުމަށް ބޭނުންކުރާ ކީ. ސެޓުނުކުރެއްވިޔަސް އޯޑަރު ނަގާނެ — ލިންކު
          އަމިއްލައަށް ފޮނުއްވަންޖެހޭނީ.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form
          action={(fd) =>
            start(async () => {
              const res = await saveMailKey(fd);
              if (res.error) toast.error(res.error);
              else toast.success("ރައްކާކުރެވިއްޖެ");
              setKey("");
            })
          }
          className="grid gap-4"
        >
          <div className="grid gap-1.5">
            <Label htmlFor="mail-key">API Key</Label>
            <Input
              id="mail-key"
              name="key"
              type="password"
              dir="ltr"
              className="text-start"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder={masked || "re_…"}
              autoComplete="off"
            />
            <p className="text-faint-ink text-[12px] leading-[1.7]">
              {source === "env"
                ? "ސާވަރުގެ environment ގައި ސެޓުކުރެވިފައި — މިތަނުން ބަދަލެއް ނުކުރެވޭނެ"
                : "ހުސްކޮށް ފޮނުއްވުމުން ކުރީގެ ކީ ބަދަލެއް ނުވާނެ"}
            </p>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="mail-from">From</Label>
            <Input
              id="mail-from"
              name="from"
              dir="ltr"
              className="text-start"
              defaultValue={from}
              placeholder="ފިޤުހު ފޮއި <noreply@fiqhfoiy.com>"
            />
            <p className="text-faint-ink text-[12px] leading-[1.7]">
              Resend ގައި ވެރިފައިކުރެވިފައިވާ ޑޮމެއިނަކަށް ވާންޖެހޭނެ
            </p>
          </div>

          <Button type="submit" disabled={pending} className="justify-self-start">
            {pending ? <Loader2Icon className="animate-spin" /> : <CheckIcon />}
            ރައްކާކުރައްވާ
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
