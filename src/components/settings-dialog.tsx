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

const searchIndex: { tabId: SettingsTab; label: string }[] = [
  { tabId: "general", label: "Gym name" },
  { tabId: "general", label: "Phone" },
  { tabId: "general", label: "Email" },
  { tabId: "general", label: "GST number" },
  { tabId: "general", label: "Timezone" },
  { tabId: "general", label: "Currency" },
  { tabId: "general", label: "Address" },
  { tabId: "general", label: "Appearance" },
  { tabId: "security", label: "Current password" },
  { tabId: "security", label: "New password" },
  { tabId: "security", label: "Enable PIN login" },
  { tabId: "security", label: "Change PIN" },
  { tabId: "security", label: "Set PIN" },
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
  const results = trimmedQuery
    ? searchIndex.filter((item) => item.label.toLowerCase().includes(trimmedQuery.toLowerCase()))
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
                {resultsOpen && results.length > 0 && (
                  <div className="absolute top-full left-0 z-20 mt-1 w-full max-h-72 overflow-y-auto rounded-md border bg-popover py-1 shadow-md">
                    {results.map((item) => {
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
                    })}
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
