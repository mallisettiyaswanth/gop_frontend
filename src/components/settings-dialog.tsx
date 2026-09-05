"use client"

import * as React from "react"
import { SearchIcon, SettingsIcon, KeyRoundIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { GeneralSettingsForm } from "@/components/settings/general-settings-form"
import { SecuritySettingsForm } from "@/components/settings/security-settings-form"

const nav = [
  { id: "general", name: "General", icon: SettingsIcon },
  { id: "security", name: "Security", icon: KeyRoundIcon },
] as const

type SettingsTab = (typeof nav)[number]["id"]

type SearchEntry = { tabId: SettingsTab; label: string; keywords?: string[] }

// `keywords` are extra terms a user might search for that never appear in the
// UI (synonyms, related concepts) — they widen matching without changing
// what's actually displayed in the results list.
const searchIndex: SearchEntry[] = [
  { tabId: "general", label: "Gym name", keywords: ["business name"] },
  { tabId: "general", label: "Phone", keywords: ["contact number", "mobile"] },
  { tabId: "general", label: "Email", keywords: ["contact email"] },
  { tabId: "general", label: "GST number", keywords: ["tax id", "tax number"] },
  { tabId: "general", label: "Timezone", keywords: ["time zone"] },
  { tabId: "general", label: "Currency", keywords: ["money"] },
  { tabId: "general", label: "Address", keywords: ["location"] },
  {
    tabId: "general",
    label: "Appearance",
    keywords: ["theme", "dark mode", "light mode", "dark", "light", "system theme", "color scheme"],
  },
  { tabId: "security", label: "Current password" },
  { tabId: "security", label: "New password", keywords: ["change password", "reset password"] },
  { tabId: "security", label: "Enable PIN login", keywords: ["pin", "two factor", "2fa"] },
  { tabId: "security", label: "Change PIN", keywords: ["pin"] },
  { tabId: "security", label: "Set PIN", keywords: ["pin"] },
]

function HighlightedLabel({ label, query }: { label: string; query: string }) {
  const index = label.toLowerCase().indexOf(query.toLowerCase())
  if (index === -1 || !query) return <>{label}</>
  return (
    <>
      {label.slice(0, index)}
      <span className="text-primary">{label.slice(index, index + query.length)}</span>
      {label.slice(index + query.length)}
    </>
  )
}

export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [tab, setTab] = React.useState<SettingsTab>("general")
  const [query, setQuery] = React.useState("")
  const [resultsOpen, setResultsOpen] = React.useState(false)

  const trimmedQuery = query.trim()
  const lowerQuery = trimmedQuery.toLowerCase()
  const results = trimmedQuery
    ? searchIndex.filter(
        (item) =>
          item.label.toLowerCase().includes(lowerQuery) ||
          item.keywords?.some((keyword) => keyword.includes(lowerQuery) || lowerQuery.includes(keyword))
      )
    : []

  function selectResult(tabId: SettingsTab) {
    setTab(tabId)
    setQuery("")
    setResultsOpen(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) {
          setQuery("")
          setResultsOpen(false)
        }
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="overflow-hidden p-0 sm:max-w-3xl md:max-h-[760px] md:max-w-[980px] lg:max-w-[1080px]"
      >
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <DialogDescription className="sr-only">
          Manage gym profile and account security settings.
        </DialogDescription>
        <SidebarProvider
          className="h-[760px] items-start"
          style={{ "--sidebar-width": "13rem", minHeight: 0 } as React.CSSProperties}
        >
          <Sidebar collapsible="none" className="hidden border-r md:flex">
            <SidebarHeader className="pt-4">
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
                <SidebarInput
                  placeholder="Search"
                  className="pl-8"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setResultsOpen(true)
                  }}
                  onFocus={() => setResultsOpen(true)}
                  onBlur={() => setTimeout(() => setResultsOpen(false), 150)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && results.length > 0) {
                      e.preventDefault()
                      selectResult(results[0].tabId)
                    }
                    if (e.key === "Escape") {
                      setQuery("")
                      setResultsOpen(false)
                    }
                  }}
                />
                {resultsOpen && trimmedQuery && (
                  <div className="absolute top-full left-0 z-20 mt-1 w-96 max-h-72 overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
                    {results.length > 0 ? (
                      results.map((item) => {
                        const navItem = nav.find((n) => n.id === item.tabId)!
                        const Icon = navItem.icon
                        return (
                          <button
                            key={`${item.tabId}-${item.label}`}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => selectResult(item.tabId)}
                            className="flex w-full flex-col gap-0.5 rounded-sm px-3 py-1.5 text-left transition-colors hover:bg-accent"
                          >
                            <span className="flex items-center gap-2 text-sm font-medium">
                              <Icon className="size-4" />
                              {navItem.name}
                            </span>
                            <span className="pl-6 text-sm">
                              <HighlightedLabel label={item.label} query={trimmedQuery} />
                            </span>
                          </button>
                        )
                      })
                    ) : (
                      <p className="px-3 py-2 text-sm text-muted-foreground">Nothing found.</p>
                    )}
                  </div>
                )}
              </div>
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>Settings</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {nav.map((item) => (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          isActive={item.id === tab}
                          onClick={() => setTab(item.id)}
                        >
                          <item.icon />
                          <span>{item.name}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
          <main className="flex h-full flex-1 flex-col overflow-y-auto">
            <div className="sticky top-0 z-10 flex h-12 shrink-0 items-center justify-end bg-popover px-4">
              <DialogClose render={<Button variant="ghost" size="icon-sm" />}>
                <XIcon />
                <span className="sr-only">Close</span>
              </DialogClose>
            </div>
            <div className="px-8 pb-8">
              {tab === "general" ? <GeneralSettingsForm /> : <SecuritySettingsForm />}
            </div>
          </main>
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  )
}
