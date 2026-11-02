"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export interface NavItem {
  href: string;
  label: string;
  active: boolean;
}

/**
 * Category pages pass their own active slug; everything else (the library) is
 * settled here, where the current path is known.
 */
function useActive(items: NavItem[]) {
  const pathname = usePathname();
  return items.map((item) => ({
    ...item,
    active: item.active || pathname === item.href || pathname.startsWith(`${item.href}/`),
  }));
}

/**
 * The inline navigation bar, shown from `md` up.
 *
 * Its counterpart below that width is {@link SiteMobileNav}, which lives in the
 * logo row instead — the two are separate so each can sit where it belongs in
 * the header rather than sharing one slot.
 */
export function SiteNavBar({
  items,
  className = "",
}: {
  items: NavItem[];
  className?: string;
}) {
  const nav = useActive(items);

  return (
    <>
      {/* Inline bar — md and up */}
      <nav className={`hidden flex-wrap items-center gap-1 md:flex ${className}`}>
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.active ? "page" : undefined}
            className={`group hover:text-brand relative min-h-[44px] px-4 py-2.5 text-[15.5px] leading-[1.7] transition-colors ${
              item.active ? "text-brand" : "text-[#2A3D66]"
            }`}
          >
            {item.label}
            {/* Underline unfurls from the start edge; the active page keeps it
                drawn. scaleX is composited, so the hover stays cheap. */}
            <span
              className={`bg-brand-accent absolute inset-x-3.5 bottom-1 h-0.5 origin-right rounded-full transition-transform duration-200 ease-out ${
                item.active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
              }`}
            />
          </Link>
        ))}
      </nav>
    </>
  );
}

/**
 * The drawer, shown below `md`. It opens from the right — the start edge, since
 * the site is RTL — so it unfolds from the side the reader's eye already sits on.
 */
export function SiteMobileNav({ items }: { items: NavItem[] }) {
  const nav = useActive(items);
  const [open, setOpen] = useState(false);

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          aria-label="ނެވިގޭޝަން"
          className="text-brand-deep border-rule hover:border-rule-strong hover:bg-paper-2 focus-visible:ring-brand/40 inline-flex min-h-11 items-center gap-2 rounded-[3px] border px-3.5 text-[15px] leading-[1.7] transition-colors focus-visible:ring-2 focus-visible:outline-none md:hidden"
        >
          <Menu className="size-5" aria-hidden />
          ފިހުރިސްތު
        </SheetTrigger>

        <SheetContent side="right" className="w-[86%] max-w-[320px] gap-0 px-0 pb-6">
          <SheetHeader className="border-rule-soft border-b px-5 pt-1 pb-4">
            <SheetTitle className="font-heading text-heading-ink text-[20px] leading-[1.6]">
              ފިހުރިސްތު
            </SheetTitle>
          </SheetHeader>

          <nav className="flex flex-col px-2.5 pt-2">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={item.active ? "page" : undefined}
                className={`hover:bg-paper-2 active:bg-paper-3 relative flex min-h-[50px] items-center rounded-[4px] px-3.5 text-[16px] leading-[1.8] transition-colors ${
                  item.active ? "bg-paper-2 text-brand" : "text-[#2A3D66]"
                }`}
              >
                {/* Start-edge marker rather than an underline — it reads more
                    clearly in a stacked list. */}
                <span
                  className={`bg-brand-accent absolute inset-y-2.5 end-auto start-0 w-0.5 rounded-full transition-opacity ${
                    item.active ? "opacity-100" : "opacity-0"
                  }`}
                />
                {item.label}
              </Link>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
