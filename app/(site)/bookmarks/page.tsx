import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/site-header";
import { BookmarkList } from "@/components/site/bookmark-list";

export const metadata: Metadata = {
  title: "ރައްކާކުރެވިފައި",
  description: "ފަހުން ކިޔުއްވުމަށް ރައްކާކުރެއްވި ލިޔުންތައް",
  // Personal to one browser, so there is nothing here worth indexing.
  robots: { index: false, follow: true },
};

export default function BookmarksPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[820px] px-5 pt-8 pb-[90px]">
        <h1 className="font-heading text-heading-ink mb-1.5 text-[32px] leading-[1.5]">
          ރައްކާކުރެވިފައި
        </h1>
        <p className="text-muted-ink mb-7 text-[14px] leading-[1.9]">
          މި ލިސްޓު ރައްކާވެފައިވަނީ ތިޔަ ބޭފުޅާގެ މި ބްރައުޒަރުގައެވެ
        </p>
        <BookmarkList />
      </main>
    </>
  );
}
