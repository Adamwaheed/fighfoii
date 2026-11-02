"use client";

import Link from "next/link";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuBadge,
} from "@/components/ui/sidebar";
import { FolderIcon, PlusIcon } from "lucide-react";

export function NavCategories({
  categories,
}: {
  categories: { id: number; name: string; slug: string; count: number }[];
}) {
  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>ބައިތައް</SidebarGroupLabel>
      <SidebarMenu>
        {categories.map((c) => (
          <SidebarMenuItem key={c.id}>
            <SidebarMenuButton asChild>
              <Link href={`/admin/articles?category=${c.slug}`}>
                <FolderIcon />
                <span>{c.name}</span>
              </Link>
            </SidebarMenuButton>
            <SidebarMenuBadge>{c.count}</SidebarMenuBadge>
          </SidebarMenuItem>
        ))}
        <SidebarMenuItem>
          <SidebarMenuButton asChild className="text-sidebar-foreground/70">
            <Link href="/admin/categories">
              <PlusIcon className="text-sidebar-foreground/70" />
              <span>ބައި އިތުރުކުރައްވާ</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
}
