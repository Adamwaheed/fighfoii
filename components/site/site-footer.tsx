import Image from "next/image";
import Link from "next/link";
import { getSettings } from "@/lib/queries";

export function SiteFooter() {
  const settings = getSettings();
  const title = settings.site_title ?? "ފިޤުހު ފޮއި";

  return (
    <footer className="border-rule bg-paper-2 mt-auto border-t">
      <div className="mx-auto flex max-w-[1140px] flex-wrap items-center justify-between gap-4 px-5 py-[26px]">
        <Image src="/logo.png" alt={title} width={900} height={497} className="h-9 w-auto" />
        <nav className="flex flex-wrap items-center gap-4">
          <Link href="/about" className="text-muted-ink hover:text-brand text-[13px] leading-[1.9] transition-colors">
            ތަޢާރަފު
          </Link>
          <Link href="/ask" className="text-muted-ink hover:text-brand text-[13px] leading-[1.9] transition-colors">
            ސުވާލެއް
          </Link>
          <Link href="/store" className="text-muted-ink hover:text-brand text-[13px] leading-[1.9] transition-colors">
            ފިހާރަ
          </Link>
        </nav>

        <div className="text-muted-ink text-[13px] leading-[1.9]">
          © {new Date().getFullYear()} {title} — {settings.site_tagline ?? ""}
        </div>
      </div>
    </footer>
  );
}
