"use client"

import * as React from "react"
import Link from "next/link"
import {
  Dumbbell,
  LayoutDashboard,
  Users,
  CalendarCheck,
  CreditCard,
  IdCard,
  ShieldUser,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import type { CurrentUser } from "@/lib/api"

const navMain = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Members", url: "/admin/members", icon: Users },
  { title: "Attendance", url: "/admin/attendance", icon: CalendarCheck },
  { title: "Memberships", url: "/admin/memberships", icon: IdCard },
  { title: "Payments", url: "/admin/payments", icon: CreditCard },
]

const superAdminNavMain = [
  { title: "Staff", url: "/admin/staff", icon: ShieldUser },
]

export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & { user: CurrentUser }) {
  const items = user.role === "SUPER_ADMIN" ? [...navMain, ...superAdminNavMain] : navMain

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/admin" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <Dumbbell className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">My Gym</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={items} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
