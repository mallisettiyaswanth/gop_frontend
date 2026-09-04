"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { LoadingScreen } from "@/components/loading-screen"
import { ThemeToggle } from "@/components/theme-toggle"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import type { CurrentUser } from "@/lib/api"
import { getStoredUser, getToken } from "@/lib/auth-storage"

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  const router = useRouter()
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [checked, setChecked] = useState(false)

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

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-vertical:h-4 data-vertical:self-auto" />
          </div>
          <ThemeToggle />
        </header>
        <main className="flex flex-1 flex-col gap-4 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
