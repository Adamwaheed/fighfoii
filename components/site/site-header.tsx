import Image from "next/image";
import Link from "next/link";
import { getCategories, getSettings } from "@/lib/queries";
import { SiteNavBar, SiteMobileNav, type NavItem } from "./site-nav";
import { SiteSearch } from "./site-search";
import { ThemeToggle } from "./reader-controls";

export async function SiteHeader({ activeSlug }: { activeSlug?: string }) {
  const cats = getCategories();
  const settings = getSettings();

  const items: NavItem[] = [
    { href: "/library", label: "ފޮތްތައް", active: false },
    { href: "/bookmarks", label: "ރައްކާކުރެވިފައި", active: false },
    { href: "/zakat", label: "ޒަކާތް", active: false },
    { href: "/ask", label: "ސުވާލެއް", active: false },
    ...cats.map((c) => ({
      href: `/category/${c.slug}`,
      label: c.name,
      active: c.slug === activeSlug,
    })),
  ];

  return (
    <header className="border-rule bg-paper/95 sticky top-0 z-30 border-b backdrop-blur-sm">
      {/* One row: mark on the start edge, sections centred, tools on the end. */}
      <div className="mx-auto flex max-w-[1140px] items-center gap-6 px-5 py-2.5">
        {/* Both flanks are flex-1 so they claim equal width — that is what puts
            the bar on the row's true centre rather than the centre of whatever
            space happens to be left over. */}
        <div className="flex min-w-0 flex-1 justify-start">
          <Link href="/" className="flex-none" aria-label={settings.site_title ?? "ފިޤުހު ފޮއި"}>
            <Image
              src="/logo.png"
              alt={settings.site_title ?? "ފިޤުހު ފޮއި"}
              width={900}
              height={497}
              priority
              className="h-[46px] w-auto"
            />
          </Link>
        </div>

        <SiteNavBar items={items} className="flex-none justify-center" />

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2.5">
          <SiteSearch />
          <ThemeToggle />
          <SiteMobileNav items={items} />
        </div>
      </div>
    </header>
  );
}
