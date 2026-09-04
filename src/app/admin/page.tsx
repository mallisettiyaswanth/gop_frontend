"use client"

import { useEffect, useState } from "react"
import type { CurrentUser } from "@/lib/api"
import { getStoredUser } from "@/lib/auth-storage"

export default function AdminDashboardPage() {
  const [user, setUser] = useState<CurrentUser | null>(null)

  useEffect(() => {
    setUser(getStoredUser())
  }, [])

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome{user ? `, ${user.name}` : ""}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Here&apos;s what&apos;s happening today.</p>
      </div>
    </div>
  )
}
