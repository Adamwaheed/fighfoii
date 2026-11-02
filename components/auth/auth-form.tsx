"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login, type AuthFormState } from "@/lib/auth-actions";
import { AlertCircleIcon, LoaderCircleIcon } from "lucide-react";

const initial: AuthFormState = { error: null };

export function LoginForm() {
  const [state, action, pending] = useActionState(login, initial);

  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="username" className="text-muted-ink text-[13px]">
          ޔޫޒަރނޭމް
        </Label>
        <Input
          id="username"
          name="username"
          dir="ltr"
          required
          autoComplete="username"
          className="text-start"
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="password" className="text-muted-ink text-[13px]">
          ޕާސްވޯޑު
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          dir="ltr"
          required
          autoComplete="current-password"
          className="text-start"
        />
      </div>

      {state.error && (
        <p
          role="alert"
          className="text-destructive flex items-start gap-2 border border-[#E4C4BB] bg-[#FBF1EE] px-3 py-2.5 text-[14px] leading-[1.8]"
        >
          <AlertCircleIcon className="mt-1 size-4 flex-none" />
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="mt-1">
        {pending && <LoaderCircleIcon className="animate-spin" />}
        ވަދެވަޑައިގަންނަވާ
      </Button>
    </form>
  );
}
