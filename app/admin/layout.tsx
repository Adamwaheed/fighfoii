import { Direction } from "radix-ui";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ADMIN_HEADER_SLOT } from "@/components/admin/header-portal";
import { getCategoriesWithCounts } from "@/lib/queries";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "އެޑިޓޯރިއަލް" };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  // Redirects to /login when signed out; every admin page renders through here.
  const user = await requireUser();

  const categories = getCategoriesWithCounts().map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    count: c.count,
  }));

  return (
    // Radix needs the direction explicitly so menus, sliders and keyboard
    // navigation flip along with the RTL layout.
    <Direction.DirectionProvider dir="rtl">
      <TooltipProvider>
        <SidebarProvider>
          {/* The sidebar positions itself with physical edges, so RTL needs
              side="right" to sit on the reading-start edge. */}
          <AppSidebar
            side="right"
            categories={categories}
            user={{ name: user.name || user.username, email: user.email, avatar: "" }}
          />
          {/* SidebarInset ships `w-full`, which beats its own flex sizing and
              makes it the full wrapper width rather than the space left beside
              the sidebar. With the sidebar on the right in RTL, the surplus
              spills leftwards and the page scrolls horizontally by exactly the
              sidebar's width. Overriding the width here rather than in
              components/ui, which the shadcn CLI would overwrite. */}
          <SidebarInset className="w-auto min-w-0">
            <header className="bg-paper sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b px-4 transition-[width,height] ease-linear">
              <SidebarTrigger className="-ms-1 flex-none" />
              {/* Pages portal their toolbar in here — see HeaderPortal. */}
              <div
                id={ADMIN_HEADER_SLOT}
                className="no-scrollbar flex min-w-0 flex-1 items-center gap-2 overflow-x-auto"
              />
            </header>
            <div className="flex flex-1 flex-col gap-4 p-4 pt-2">
              {children}
            </div>
            <Toaster position="bottom-left" />
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </Direction.DirectionProvider>
  );
}
