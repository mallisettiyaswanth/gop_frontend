"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { PlusIcon, Table2Icon, LayoutGridIcon, PhoneIcon, MailIcon, CalendarIcon } from "lucide-react"
import { DataTable, type DataTableColumn } from "@/components/data-table"
import { DataGridColumnHeader } from "@/components/reui/data-grid/data-grid-column-header"
import { Badge, type BadgeProps } from "@/components/reui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field"
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
  ApiError,
  type Member,
  type MemberStatus,
} from "@/lib/api"
import { getToken } from "@/lib/auth-storage"
import { cn } from "@/lib/utils"

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

const columns: DataTableColumn<Member>[] = [
  {
    accessorKey: "memberCode",
    header: ({ column }) => <DataGridColumnHeader column={column} title="Member" />,
    meta: { headerTitle: "Member" },
  },
  {
    accessorKey: "name",
    header: ({ column }) => <DataGridColumnHeader column={column} title="Name" />,
    meta: { headerTitle: "Name" },
  },
  {
    accessorKey: "phone",
    header: ({ column }) => <DataGridColumnHeader column={column} title="Phone" />,
    meta: { headerTitle: "Phone" },
  },
  {
    accessorKey: "email",
    header: ({ column }) => <DataGridColumnHeader column={column} title="Email" />,
    cell: ({ row }) => row.original.email ?? "—",
    meta: { headerTitle: "Email" },
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
    cell: ({ row }) => (
      <Badge variant={statusVariant[row.original.status]}>
        {statusLabel[row.original.status]}
      </Badge>
    ),
    meta: { headerTitle: "Status" },
  },
  {
    accessorKey: "joinDate",
    header: ({ column }) => <DataGridColumnHeader column={column} title="Joined" />,
    cell: ({ row }) => new Date(row.original.joinDate).toLocaleDateString(),
    meta: { headerTitle: "Joined" },
  },
]

const addMemberSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.union([z.literal(""), z.string().email("Enter a valid email address")]),
})

type AddMemberValues = z.infer<typeof addMemberSchema>

function MemberCard({ member }: { member: Member }) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-4 transition-shadow hover:shadow-sm">
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

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [view, setView] = useState<"table" | "cards">("table")

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddMemberValues>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: { name: "", phone: "", email: "" },
  })

  async function loadMembers() {
    const token = getToken()
    if (!token) return
    setLoading(true)
    setLoadError(null)
    try {
      const data = await listMembers(token)
      setMembers(data)
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Couldn't load members.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMembers()
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
      loadMembers()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Something went wrong. Try again.")
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-6">
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
          isSearchEnable
          isFiltersEnable
          isViewEnable
          enableColumnPinning
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <MemberCardSkeleton key={i} />
              ))}
            </div>
          ) : members.length === 0 ? (
            <div className={cn("flex h-full items-center justify-center rounded-lg border py-16 text-sm text-muted-foreground")}>
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
