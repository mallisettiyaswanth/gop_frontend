"use client"

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import type { CSSProperties } from "react"
import { useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  PlusIcon,
  Table2Icon,
  LayoutGridIcon,
  PhoneIcon,
  MailIcon,
  CalendarIcon,
  FlameIcon,
  InfoIcon,
} from "lucide-react"
import {
  DataTable,
  type DataTableColumn,
  type DataTableServerQuery,
  multiSelectFilterFn,
} from "@/components/data-table"
import { DataGridColumnHeader } from "@/components/reui/data-grid/data-grid-column-header"
import { Badge, type BadgeProps } from "@/components/reui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  listMembers,
  createMember,
  listMembershipPlans,
  ApiError,
  type Member,
  type MemberStatus,
  type MembershipPlan,
} from "@/lib/api"
import { getToken } from "@/lib/auth-storage"

const statusVariant: Record<MemberStatus, BadgeProps["variant"]> = {
  ACTIVE: "success-light",
  EXPIRING_SOON: "warning-light",
  EXPIRED: "destructive-light",
  FROZEN: "info-light",
  CANCELLED: "destructive-outline",
  PENDING: "secondary",
}

const statusLabel: Record<MemberStatus, string> = {
  ACTIVE: "Active",
  EXPIRING_SOON: "Expiring soon",
  EXPIRED: "Expired",
  FROZEN: "Frozen",
  CANCELLED: "Cancelled",
  PENDING: "Pending",
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

function formatCurrency(value: number | string) {
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })
}

/** Finds which named tier a membership's snapshot price matches, for display. */
function tierLabelFor(member: Member) {
  const membership = member.membership
  if (!membership) return null
  return (
    membership.plan.priceTiers.find((tier) => tier.price === Number(membership.price))?.label ??
    null
  )
}

/** Full plan summary (name, tier, price, validity) — used on the member cards. */
function MembershipCell({ member }: { member: Member }) {
  const membership = member.membership
  if (!membership) {
    return <span className="text-sm text-muted-foreground">No active plan</span>
  }
  const tier = tierLabelFor(member)
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5 text-sm font-medium">
        {membership.plan.color && (
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: membership.plan.color }}
            aria-hidden
          />
        )}
        <span className="truncate">{membership.plan.name}</span>
        {tier && <span className="font-normal text-muted-foreground">· {tier}</span>}
      </div>
      <span className="text-xs text-muted-foreground">
        ₹{formatCurrency(membership.price)} · until{" "}
        {new Date(membership.endDate).toLocaleDateString()}
      </span>
    </div>
  )
}

/** Just the plan name + color dot — the table keeps duration/expiry in their own columns. */
function PlanCell({ member }: { member: Member }) {
  const membership = member.membership
  if (!membership) {
    return (
      <span className="block min-w-[110px] text-sm whitespace-nowrap text-muted-foreground">
        No active plan
      </span>
    )
  }
  return (
    <div className="flex min-w-[110px] items-center gap-1.5 text-sm font-medium">
      {/* {membership.plan.color && (
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: membership.plan.color }}
          aria-hidden
        />
      )} */}
      <span>{membership.plan.name.split(" ")[0]}</span>
    </div>
  )
}

function DurationCell({ member }: { member: Member }) {
  const tier = tierLabelFor(member)
  return <span className="text-sm">{tier ?? <span className="text-muted-foreground">—</span>}</span>
}

function ExpiresCell({ member }: { member: Member }) {
  const endDate = member.membership?.endDate
  if (!endDate) return <span className="text-sm text-muted-foreground">—</span>
  return <span className="text-sm">{new Date(endDate).toLocaleDateString()}</span>
}

function StreakCell({ streak }: { streak: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <FlameIcon
        className={`size-4 ${streak > 0 ? "text-orange-500" : "text-muted-foreground/40"}`}
      />
      <span className="font-medium">{streak}</span>
    </div>
  )
}

function StreakInfo() {
  return (
    <Tooltip>
      <TooltipTrigger>
        <InfoIcon className="size-3.5 text-muted-foreground" />
      </TooltipTrigger>
      <TooltipContent>
        Streak: number of weeks the member attended the gym on 5 or more days.
      </TooltipContent>
    </Tooltip>
  )
}

function MembershipInfo() {
  return (
    <Tooltip>
      <TooltipTrigger>
        <InfoIcon className="size-3.5 text-muted-foreground" />
      </TooltipTrigger>
      <TooltipContent>
        Row color matches the member&apos;s plan — set a plan&apos;s highlight color on the
        Memberships page.
      </TooltipContent>
    </Tooltip>
  )
}

/** Tints a row with its membership plan's color, so e.g. all PT members read at a glance. */
function getMemberRowStyle(member: Member): CSSProperties | undefined {
  const color = member.membership?.plan.color
  if (!color) return undefined
  return {
    backgroundColor: `color-mix(in oklab, ${color} 9%, transparent)`,
  }
}

const addMemberSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.union([z.literal(""), z.string().email("Enter a valid email address")]),
})

type AddMemberValues = z.infer<typeof addMemberSchema>

function MemberCard({ member }: { member: Member }) {
  const color = member.membership?.plan.color
  return (
    <div
      className="flex flex-col gap-4 rounded-lg border bg-card p-4 transition-shadow hover:shadow-sm"
      style={color ? { borderLeftColor: color, borderLeftWidth: 3 } : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {initials(member.name)}
          </div>
          <div className="min-w-0">
            <div className="truncate font-medium">{member.name}</div>
            <div className="text-xs text-muted-foreground">{member.memberCode}</div>
          </div>
        </div>
        <Badge variant={statusVariant[member.status]} className="shrink-0">
          {statusLabel[member.status]}
        </Badge>
      </div>

      <div className="flex flex-col gap-1.5 border-t pt-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <PhoneIcon className="size-3.5 shrink-0" />
          <span className="truncate">{member.phone}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <MailIcon className="size-3.5 shrink-0" />
          <span className="truncate">{member.email ?? "—"}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <CalendarIcon className="size-3.5 shrink-0" />
          <span>Joined {new Date(member.joinDate).toLocaleDateString()}</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t pt-3">
        <MembershipCell member={member} />
        <StreakCell streak={member.streak} />
      </div>
    </div>
  )
}

function MemberCardSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="h-5 w-16 shrink-0" />
      </div>
      <div className="flex flex-col gap-2 border-t pt-3">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="h-3.5 w-36" />
      </div>
    </div>
  )
}

function MembersPageContent() {
  const searchParams = useSearchParams()
  const planIdParam = searchParams.get("planId")
  const initialFilters = useMemo(
    () => (planIdParam ? [{ id: "membership", value: [planIdParam] }] : []),
    [planIdParam]
  )

  const [members, setMembers] = useState<Member[]>([])
  const [total, setTotal] = useState(0)
  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [view, setView] = useState<"table" | "cards">("table")
  const [query, setQuery] = useState<DataTableServerQuery>(() => ({
    skip: 0,
    limit: 25,
    filters: initialFilters,
  }))

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddMemberValues>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: { name: "", phone: "", email: "" },
  })

  const columns: DataTableColumn<Member>[] = useMemo(() => [
    {
      id: "rowNumber",
      header: ({ column }) => <DataGridColumnHeader column={column} title="#" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground">{query.skip + row.index + 1}</span>
      ),
      // A page-relative index isn't a real sortable/filterable field on the
      // backend (same reasoning as the Duration/Expires/Streak columns).
      enableSorting: false,
      enableColumnFilter: false,
      size: 40,
      meta: { headerTitle: "#", skeleton: <Skeleton className="h-4 w-6" /> },
    },
    {
      accessorKey: "memberCode",
      header: ({ column }) => <DataGridColumnHeader column={column} title="Member" />,
      enableColumnFilter: false,
      meta: { headerTitle: "Member", skeleton: <Skeleton className="h-4 w-20" /> },
    },
    {
      accessorKey: "name",
      header: ({ column }) => <DataGridColumnHeader column={column} title="Name" />,
      cell: ({ row }) => <span className="block min-w-[170px] font-medium">{row.original.name}</span>,
      meta: { headerTitle: "Name", skeleton: <Skeleton className="h-4 w-32" /> },
    },
    {
      accessorKey: "phone",
      header: ({ column }) => <DataGridColumnHeader column={column} title="Phone" />,
      enableColumnFilter: false,
      meta: { headerTitle: "Phone", skeleton: <Skeleton className="h-4 w-24" /> },
    },
    {
      accessorKey: "email",
      header: ({ column }) => <DataGridColumnHeader column={column} title="Email" />,
      cell: ({ row }) => row.original.email ?? "—",
      enableColumnFilter: false,
      meta: { headerTitle: "Email", skeleton: <Skeleton className="h-4 w-36" /> },
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
      cell: ({ row }) => (
        <Badge variant={statusVariant[row.original.status]}>
          {statusLabel[row.original.status]}
        </Badge>
      ),
      filterFn: multiSelectFilterFn,
      meta: {
        headerTitle: "Status",
        variant: "select",
        options: (Object.keys(statusLabel) as MemberStatus[]).map((status) => ({
          label: statusLabel[status],
          value: status,
        })),
        skeleton: <Skeleton className="h-5 w-20 rounded-full" />,
      },
    },
    {
      id: "membership",
      accessorFn: (row) => row.membership?.planId ?? "",
      header: ({ column }) => (
        <div className="flex items-center gap-1">
          <DataGridColumnHeader column={column} title="Membership" />
          <MembershipInfo />
        </div>
      ),
      cell: ({ row }) => <PlanCell member={row.original} />,
      enableSorting: false,
      filterFn: multiSelectFilterFn,
      meta: {
        headerTitle: "Membership",
        variant: "select",
        options: plans.map((plan) => ({ label: plan.name, value: plan.id })),
        skeleton: <Skeleton className="h-4 w-32" />,
      },
    },
    {
      id: "duration",
      accessorFn: (row) => tierLabelFor(row) ?? "",
      header: ({ column }) => <DataGridColumnHeader column={column} title="Duration" />,
      cell: ({ row }) => <DurationCell member={row.original} />,
      enableSorting: false,
      enableColumnFilter: false,
      meta: { headerTitle: "Duration", skeleton: <Skeleton className="h-4 w-16" /> },
    },
    {
      id: "expires",
      accessorFn: (row) => row.membership?.endDate ?? "",
      header: ({ column }) => <DataGridColumnHeader column={column} title="Expires" />,
      cell: ({ row }) => <ExpiresCell member={row.original} />,
      enableSorting: false,
      enableColumnFilter: false,
      meta: { headerTitle: "Expires", skeleton: <Skeleton className="h-4 w-20" /> },
    },
    {
      accessorKey: "streak",
      header: ({ column }) => (
        <div className="flex items-center gap-1">
          <DataGridColumnHeader
            column={column}
            title=""
            icon={<FlameIcon className="size-3.5" />}
          />
          <StreakInfo />
        </div>
      ),
      cell: ({ row }) => <StreakCell streak={row.original.streak} />,
      enableSorting: false,
      enableColumnFilter: false,
      meta: { headerTitle: "Streak", skeleton: <Skeleton className="h-4 w-16" /> },
    },
    {
      accessorKey: "joinDate",
      header: ({ column }) => <DataGridColumnHeader column={column} title="Joined" />,
      cell: ({ row }) => new Date(row.original.joinDate).toLocaleDateString(),
      enableColumnFilter: false,
      meta: { headerTitle: "Joined", skeleton: <Skeleton className="h-4 w-20" /> },
    },
  ], [plans, query.skip])

  const fetchMembers = useCallback(async (q: DataTableServerQuery) => {
    const token = getToken()
    if (!token) return
    setLoading(true)
    setLoadError(null)
    try {
      const statusValue = q.filters.find((f) => f.id === "status")?.value as string[] | undefined
      const searchValue = q.filters.find((f) => f.id === "name")?.value as string | undefined
      const planValue = q.filters.find((f) => f.id === "membership")?.value as
        | string[]
        | undefined

      const result = await listMembers(token, {
        skip: q.skip,
        limit: q.limit,
        sortBy: q.sortBy,
        sortDir: q.sortDir,
        status: statusValue && statusValue.length > 0 ? statusValue.join(",") : undefined,
        planId: planValue && planValue.length > 0 ? planValue.join(",") : undefined,
        search: searchValue || undefined,
      })
      setMembers(result.data)
      setTotal(result.total)
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Couldn't load members.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMembers(query)
  }, [query, fetchMembers])

  useEffect(() => {
    const token = getToken()
    if (!token) return
    listMembershipPlans(token).then(setPlans).catch(() => {})
  }, [])

  async function onSubmit(values: AddMemberValues) {
    const token = getToken()
    if (!token) return
    setFormError(null)
    try {
      await createMember(token, {
        name: values.name,
        phone: values.phone,
        email: values.email || undefined,
      })
      reset()
      setDialogOpen(false)
      fetchMembers(query)
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Something went wrong. Try again.")
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Everyone signed up at the gym.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border p-0.5">
            <Button
              variant={view === "table" ? "secondary" : "ghost"}
              size="icon-sm"
              aria-label="Table view"
              onClick={() => setView("table")}
            >
              <Table2Icon />
            </Button>
            <Button
              variant={view === "cards" ? "secondary" : "ghost"}
              size="icon-sm"
              aria-label="Card view"
              onClick={() => setView("cards")}
            >
              <LayoutGridIcon />
            </Button>
          </div>
          <Button
            onClick={() => {
              setFormError(null)
              setDialogOpen(true)
            }}
          >
            <PlusIcon />
            Add member
          </Button>
        </div>
      </div>

      {loadError && (
        <Alert variant="destructive">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      {view === "table" ? (
        <DataTable
          columns={columns}
          data={members}
          getRowId={(row) => row.id}
          isLoading={loading}
          emptyMessage="No members yet."
          pageSize={25}
          isFiltersEnable
          isSortListEnable
          isViewEnable
          enableColumnPinning
          initialColumnPinning={{ start: ["rowNumber", "name"] }}
          initialColumnVisibility={{ memberCode: false }}
          initialColumnFilters={initialFilters}
          maxVisibleRows={13}
          getRowStyle={getMemberRowStyle}
          serverSide
          rowCount={total}
          onQueryChange={setQuery}
        />
      ) : (
        <div>
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <MemberCardSkeleton key={i} />
              ))}
            </div>
          ) : members.length === 0 ? (
            <div className="flex items-center justify-center rounded-lg border py-16 text-sm text-muted-foreground">
              No members yet.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {members.map((member) => (
                <MemberCard key={member.id} member={member} />
              ))}
            </div>
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add member</DialogTitle>
            <DialogDescription>
              Add a new member to the gym. You can fill in more details later.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <FieldGroup>
              {formError && (
                <Alert variant="destructive">
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}
              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="name">Name</FieldLabel>
                <Input id="name" aria-invalid={!!errors.name} {...register("name")} />
                <FieldError errors={[errors.name]} />
              </Field>
              <Field data-invalid={!!errors.phone}>
                <FieldLabel htmlFor="phone">Phone</FieldLabel>
                <Input id="phone" aria-invalid={!!errors.phone} {...register("phone")} />
                <FieldError errors={[errors.phone]} />
              </Field>
              <Field data-invalid={!!errors.email}>
                <FieldLabel htmlFor="email">Email (optional)</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  aria-invalid={!!errors.email}
                  {...register("email")}
                />
                <FieldError errors={[errors.email]} />
              </Field>
            </FieldGroup>
            <DialogFooter className="mt-6">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Spinner />}
                {isSubmitting ? "Adding…" : "Add member"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function MembersPage() {
  return (
    <Suspense>
      <MembersPageContent />
    </Suspense>
  )
}
