import type { ReactNode } from "react"
import { cn } from "cn"

export function SettingsSection({
  title,
  children,
  className,
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col", className)}>
      <h3 className="mb-1 text-base font-semibold">{title}</h3>
      <div className="flex flex-col">{children}</div>
    </div>
  )
}

export function SettingsRow({
  label,
  htmlFor,
  description,
  children,
  stacked = false,
  align = "center",
}: {
  label: string
  htmlFor?: string
  description?: string
  children: ReactNode
  stacked?: boolean
  align?: "center" | "start"
}) {
  if (stacked) {
    return (
      <div className="flex flex-col gap-2 border-b border-border/40 py-4 last:border-b-0">
        <div>
          <label htmlFor={htmlFor} className="text-sm font-medium">
            {label}
          </label>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
        {children}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex gap-6 border-b border-border/40 py-4 last:border-b-0",
        align === "start" ? "items-start" : "items-center"
      )}
    >
      <div className="min-w-0 flex-1">
        <label htmlFor={htmlFor} className="text-sm font-medium">
          {label}
        </label>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="w-72 shrink-0">{children}</div>
    </div>
  )
}

export function SettingsFieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-xs text-destructive">{message}</p>
}
