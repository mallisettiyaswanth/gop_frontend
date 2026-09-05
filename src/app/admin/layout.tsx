"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { AppSidebar, navMain, superAdminNavMain } from "@/components/app-sidebar"
import { LoadingScreen } from "@/components/loading-screen"
import { SettingsDialog } from "@/components/settings-dialog"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import type { CurrentUser } from "@/lib/api"
import { getStoredUser, getToken } from "@/lib/auth-storage"

const allNavItems = [...navMain, ...superAdminNavMain]

function getRouteTitle(pathname: string) {
  const match = allNavItems.find((item) => item.url === pathname)
  if (match) return match.title
  const lastSegment = pathname.split("/").filter(Boolean).at(-1)
  if (!lastSegment) return "Dashboard"
  return lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1)
}

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [checked, setChecked] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    const token = getToken()
    const storedUser = getStoredUser()
    if (!token || !storedUser) {
      router.replace("/login")
      return
    }
    setUser(storedUser)
    setChecked(true)
  }, [router])

  if (!checked || !user) {
    return <LoadingScreen />
  }

  const routeTitle = getRouteTitle(pathname)

  return (
    <SidebarProvider className="h-svh">
      <AppSidebar user={user} onOpenSettings={() => setSettingsOpen(true)} />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <SidebarInset className="min-h-0">
        <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-vertical:h-4 data-vertical:self-auto" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>{routeTitle}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
