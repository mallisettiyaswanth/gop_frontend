"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Building2Icon, LockIcon } from "lucide-react"
import { cn } from "@/lib/utils"

const settingsNav = [
  { title: "General", url: "/admin/settings/general", icon: Building2Icon },
  { title: "Security", url: "/admin/settings/security", icon: LockIcon },
]

export default function SettingsLayout({ children }: LayoutProps<"/admin/settings">) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your gym profile and account security.
        </p>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-6 md:flex-row">
        <nav className="flex shrink-0 flex-row gap-1 overflow-x-auto md:w-48 md:flex-col md:overflow-visible">
          {settingsNav.map((item) => {
            const isActive = pathname === item.url
            return (
              <Link
                key={item.url}
                href={item.url}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                  isActive
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="size-4" />
                {item.title}
              </Link>
            )
          })}
        </nav>
        <div className="min-h-0 min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}
