"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { NavCategories } from "@/components/nav-categories";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  BookOpenIcon,
  ExternalLinkIcon,
  FileTextIcon,
  LayoutDashboardIcon,
  PlusIcon,
  Settings2Icon,
  TagsIcon,
  InboxIcon,
  ShoppingBagIcon,
  UsersIcon,
} from "lucide-react";

const NAV = [
  { title: "ޑޭޝްބޯޑު", url: "/admin", icon: LayoutDashboardIcon, exact: true },
  { title: "ލިޔުންތައް", url: "/admin/articles", icon: FileTextIcon },
  { title: "ބައިތައް", url: "/admin/categories", icon: TagsIcon },
  { title: "ފޮތްތައް", url: "/admin/books", icon: BookOpenIcon },
  { title: "ލިބުނު ޚިޔާލު", url: "/admin/inbox", icon: InboxIcon },
  { title: "ފިހާރަ", url: "/admin/store", icon: ShoppingBagIcon },
  { title: "ފަރާތްތައް", url: "/admin/users", icon: UsersIcon },
  { title: "ސެޓިންގްސް", url: "/admin/settings", icon: Settings2Icon },
];

export function AppSidebar({
  categories,
  user,
  ...props
}: {
  categories: { id: number; name: string; slug: string; count: number }[];
  user: { name: string; email: string; avatar: string };
} & React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/admin">
                <span className="bg-brand text-paper font-heading flex aspect-square size-8 items-center justify-center rounded-full pb-1 text-[19px] leading-none">
                  ފ
                </span>
                <div className="grid flex-1 text-start leading-tight">
                  <span className="font-heading truncate text-[17px]">ފިޤުހު ފޮއި</span>
                  <span className="truncate text-xs">އެޑިޓޯރިއަލް</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>ބެލެހެއްޓުން</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="އައު ލިޔުމެއް">
                <Link href="/admin/articles/new">
                  <PlusIcon />
                  <span>އައު ލިޔުމެއް</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {NAV.map((item) => {
              const active = item.exact
                ? pathname === item.url
                : pathname.startsWith(item.url);
              return (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>

        <NavCategories categories={categories} />

        <SidebarGroup className="mt-auto">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="ވެބްސައިޓު">
                <Link href="/" target="_blank">
                  <ExternalLinkIcon />
                  <span>ވެބްސައިޓު ބައްލަވާ</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
