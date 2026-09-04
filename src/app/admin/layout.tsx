"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LoadingScreen } from "@/components/loading-screen"
import type { CurrentUser } from "@/lib/api"
import { getStoredUser, getToken, clearSession } from "@/lib/auth-storage"

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

  function handleLogout() {
    clearSession()
    router.replace("/login")
  }

  if (!checked) {
    return <LoadingScreen />
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <span className="text-sm font-semibold">My Gym Admin</span>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">{user?.name}</span>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Log out
          </Button>
        </div>
      </header>
      <main className="flex flex-1 flex-col px-6 py-8">{children}</main>
    </div>
  )
}
