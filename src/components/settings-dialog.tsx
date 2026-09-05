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

export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [tab, setTab] = React.useState<SettingsTab>("general")
  const [query, setQuery] = React.useState("")

  const filteredNav = nav.filter((item) =>
    item.name.toLowerCase().includes(query.trim().toLowerCase())
  )

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) setQuery("")
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
                <SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
                <SidebarInput
                  placeholder="Search"
                  className="pl-8"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>Settings</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {filteredNav.map((item) => (
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
                    {filteredNav.length === 0 && (
                      <p className="px-2 py-1.5 text-sm text-muted-foreground">
                        No settings found.
                      </p>
                    )}
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
