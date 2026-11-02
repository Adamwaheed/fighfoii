import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/auth-form";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "ވަނުން" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/admin");

  return (
    <main className="flex min-h-svh items-center justify-center px-5 py-16">
      <div className="w-full max-w-[380px]">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Image
            src="/logo.png"
            alt="ފިޤުހު ފޮއި"
            width={900}
            height={497}
            priority
            className="h-16 w-auto"
          />
          <div>
            <h1 className="sr-only">ފިޤުހު ފޮއި</h1>
            <p className="text-muted-ink mt-1 text-[13.5px] leading-[1.8]">
              އެޑިޓޯރިއަލް ޕެނަލަށް ވަޑައިގަންނަވާ
            </p>
          </div>
        </div>

        <div className="border-rule bg-card border p-6">
          <LoginForm />
        </div>

        <p className="mt-6 text-center">
          <Link href="/" className="text-brand hover:text-brand-accent text-[13.5px] transition-colors">
            ← ވެބްސައިޓަށް
          </Link>
        </p>
      </div>
    </main>
  );
}
