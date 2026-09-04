"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { PlusIcon } from "lucide-react"
import { DataTable, type DataTableColumn } from "@/components/data-table"
import { DataGridColumnHeader } from "@/components/reui/data-grid/data-grid-column-header"
import { Badge, type BadgeProps } from "@/components/reui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
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

const columns: DataTableColumn<Member>[] = [
  {
    accessorKey: "memberCode",
    header: ({ column }) => <DataGridColumnHeader column={column} title="Member" />,
  },
  {
    accessorKey: "name",
    header: ({ column }) => <DataGridColumnHeader column={column} title="Name" />,
  },
  {
    accessorKey: "phone",
    header: ({ column }) => <DataGridColumnHeader column={column} title="Phone" />,
  },
  {
    accessorKey: "email",
    header: ({ column }) => <DataGridColumnHeader column={column} title="Email" />,
    cell: ({ row }) => row.original.email ?? "—",
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
    cell: ({ row }) => (
      <Badge variant={statusVariant[row.original.status]}>
        {statusLabel[row.original.status]}
      </Badge>
    ),
  },
  {
    accessorKey: "joinDate",
    header: ({ column }) => <DataGridColumnHeader column={column} title="Joined" />,
    cell: ({ row }) => new Date(row.original.joinDate).toLocaleDateString(),
  },
]

const addMemberSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.union([z.literal(""), z.string().email("Enter a valid email address")]),
})

type AddMemberValues = z.infer<typeof addMemberSchema>

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

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

      {loadError && (
        <Alert variant="destructive">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      <DataTable
        columns={columns}
        data={members}
        getRowId={(row) => row.id}
        isLoading={loading}
        emptyMessage="No members yet."
      />

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
