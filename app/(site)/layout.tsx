import { SiteFooter } from "@/components/site/site-footer";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      {children}
      <SiteFooter />
    </>
  );
}
