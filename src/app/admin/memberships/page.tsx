"use client"

import { useEffect, useState } from "react"
import { Controller, useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  PlusIcon,
  XIcon,
  CheckIcon,
  PencilIcon,
  Table2Icon,
  LayoutGridIcon,
} from "lucide-react"
import { DataTable, type DataTableColumn, multiSelectFilterFn } from "@/components/data-table"
import { DataGridColumnHeader } from "@/components/reui/data-grid/data-grid-column-header"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
  FieldDescription,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/reui/badge"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import {
  listMembershipPlans,
  createMembershipPlan,
  updateMembershipPlan,
  ApiError,
  type MembershipPlan,
} from "@/lib/api"
import { getToken } from "@/lib/auth-storage"
import { toast } from "@/lib/toast"

const optionalAmount = z.union([
  z.literal(""),
  z.string().regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount"),
])
const optionalWholeNumber = z.union([z.literal(""), z.string().regex(/^\d+$/, "Enter a whole number")])

const planSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string(),
  level: z.string(),
  description: z.string(),
  priceTiers: z
    .array(
      z.object({
        label: z.string().min(1, "Name this price"),
        price: z.string().regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount"),
      })
    )
    .min(1, "Add at least one price"),
  joiningFee: optionalAmount,
  taxPercent: optionalAmount,
  visitLimit: optionalWholeNumber,
  features: z.array(z.object({ value: z.string().min(1, "Feature can't be empty") })),
  isActive: z.boolean(),
})

type PlanFormValues = z.infer<typeof planSchema>

const emptyValues: PlanFormValues = {
  name: "",
  category: "",
  level: "",
  description: "",
  priceTiers: [{ label: "Monthly", price: "" }],
  joiningFee: "",
  taxPercent: "",
  visitLimit: "",
  features: [],
  isActive: true,
}

function formatCurrency(value: number | string) {
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })
}

const columns: DataTableColumn<MembershipPlan>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => <DataGridColumnHeader column={column} title="Plan" />,
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span className="font-medium">{row.original.name}</span>
        {row.original.level && (
          <Badge variant="secondary" className="shrink-0">
            {row.original.level}
          </Badge>
        )}
      </div>
    ),
    meta: { headerTitle: "Plan", skeleton: <Skeleton className="h-4 w-32" /> },
  },
  {
    accessorKey: "category",
    header: ({ column }) => <DataGridColumnHeader column={column} title="Category" />,
    cell: ({ row }) => row.original.category ?? "—",
    meta: { headerTitle: "Category", skeleton: <Skeleton className="h-4 w-24" /> },
  },
  {
    id: "pricing",
    accessorFn: (row) =>
      row.priceTiers.map((tier) => `${tier.label} ₹${formatCurrency(tier.price)}`).join(" · "),
    header: ({ column }) => <DataGridColumnHeader column={column} title="Pricing" />,
    meta: { headerTitle: "Pricing", skeleton: <Skeleton className="h-4 w-48" /> },
  },
  {
    accessorKey: "joiningFee",
    header: ({ column }) => <DataGridColumnHeader column={column} title="Joining fee" />,
    cell: ({ row }) =>
      Number(row.original.joiningFee) > 0 ? `₹${formatCurrency(row.original.joiningFee)}` : "—",
    meta: { headerTitle: "Joining fee", skeleton: <Skeleton className="h-4 w-16" /> },
  },
  {
    accessorKey: "visitLimit",
    header: ({ column }) => <DataGridColumnHeader column={column} title="Visit limit" />,
    cell: ({ row }) => row.original.visitLimit ?? "Unlimited",
    meta: { headerTitle: "Visit limit", skeleton: <Skeleton className="h-4 w-16" /> },
  },
  {
    accessorKey: "isActive",
    header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
    cell: ({ row }) => (
      <Badge variant={row.original.isActive ? "success-light" : "destructive-light"}>
        {row.original.isActive ? "Active" : "Inactive"}
      </Badge>
    ),
    filterFn: multiSelectFilterFn,
    meta: {
      headerTitle: "Status",
      variant: "select",
      options: [
        { label: "Active", value: "true" },
        { label: "Inactive", value: "false" },
      ],
      skeleton: <Skeleton className="h-5 w-16 rounded-full" />,
    },
  },
]

function PriceHeadline({ plan }: { plan: MembershipPlan }) {
  if (plan.priceTiers.length === 0) return null

  // A single price gets the big headline treatment; several tiers on the
  // same plan (e.g. Monthly + 3 Months + Yearly) are shown side by side at
  // equal weight instead of picking one as "primary" and shrinking the rest.
  if (plan.priceTiers.length === 1) {
    const [only] = plan.priceTiers
    return (
      <div className="flex items-baseline gap-1.5">
        <span className="text-3xl font-bold tracking-tight">₹{formatCurrency(only.price)}</span>
        <span className="text-sm text-muted-foreground">{only.label}</span>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-end gap-5">
      {plan.priceTiers.map((tier, i) => (
        <div key={i} className="flex flex-col">
          <span className="text-xs text-muted-foreground">{tier.label}</span>
          <span className="text-2xl font-bold tracking-tight">₹{formatCurrency(tier.price)}</span>
        </div>
      ))}
    </div>
  )
}

function PlanCard({ plan, onEdit }: { plan: MembershipPlan; onEdit: () => void }) {
  const extras = [
    Number(plan.joiningFee) > 0 && `Joining fee ₹${formatCurrency(plan.joiningFee)}`,
    Number(plan.taxPercent) > 0 && `Tax ${plan.taxPercent}%`,
    plan.visitLimit != null && `${plan.visitLimit} visits/mo`,
  ].filter((extra): extra is string => !!extra)

  return (
    <div className="flex flex-col gap-4 rounded-xl border p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {plan.category && (
            <p className="truncate text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {plan.category}
            </p>
          )}
          <h3 className="truncate text-lg font-semibold">{plan.name}</h3>
        </div>
        <Badge variant={plan.isActive ? "success-light" : "destructive-light"} className="shrink-0">
          {plan.isActive ? "Active" : "Inactive"}
        </Badge>
      </div>

      {plan.level && (
        <Badge variant="secondary" className="-mt-2 w-fit">
          {plan.level}
        </Badge>
      )}

      {plan.description && <p className="text-sm text-muted-foreground">{plan.description}</p>}

      <div className="border-t border-border/40 pt-3">
        <PriceHeadline plan={plan} />
      </div>

      {extras.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {extras.map((extra) => (
            <span
              key={extra}
              className="rounded-full border border-border/60 px-2 py-0.5 text-xs text-muted-foreground"
            >
              {extra}
            </span>
          ))}
        </div>
      )}

      {plan.features.length > 0 && (
        <ul className="flex flex-col gap-1.5 border-t border-border/40 pt-3 text-sm">
          {plan.features.map((feature, i) => (
            <li key={i} className="flex items-start gap-2">
              <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-primary" />
              <span className="leading-snug">{feature}</span>
            </li>
          ))}
        </ul>
      )}

      <Button variant="outline" size="sm" className="mt-auto" onClick={onEdit}>
        <PencilIcon />
        Edit
      </Button>
    </div>
  )
}

function PlanCardSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-xl border p-5">
      <div className="flex items-start justify-between gap-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-5 w-16" />
      </div>
      <div className="flex flex-col gap-2 border-t border-border/40 pt-3">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  )
}

export default function MembershipsPage() {
  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [view, setView] = useState<"table" | "cards">("cards")

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema),
    defaultValues: emptyValues,
  })

  const {
    fields: featureFields,
    append: appendFeature,
    remove: removeFeature,
  } = useFieldArray({ control, name: "features" })
  const {
    fields: priceTierFields,
    append: appendPriceTier,
    remove: removePriceTier,
  } = useFieldArray({ control, name: "priceTiers" })

  async function loadPlans() {
    const token = getToken()
    if (!token) return
    setLoading(true)
    try {
      const data = await listMembershipPlans(token)
      setPlans(data)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't load membership plans.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPlans()
  }, [])

  function openAddDialog() {
    setEditingId(null)
    reset(emptyValues)
    setDialogOpen(true)
  }

  function openEditDialog(plan: MembershipPlan) {
    setEditingId(plan.id)
    reset({
      name: plan.name,
      category: plan.category ?? "",
      level: plan.level ?? "",
      description: plan.description ?? "",
      priceTiers:
        plan.priceTiers.length > 0
          ? plan.priceTiers.map((tier) => ({ label: tier.label, price: String(tier.price) }))
          : [{ label: "Monthly", price: "" }],
      joiningFee: Number(plan.joiningFee) > 0 ? plan.joiningFee : "",
      taxPercent: Number(plan.taxPercent) > 0 ? plan.taxPercent : "",
      visitLimit: plan.visitLimit != null ? String(plan.visitLimit) : "",
      features: plan.features.map((value) => ({ value })),
      isActive: plan.isActive,
    })
    setDialogOpen(true)
  }

  async function onSubmit(values: PlanFormValues) {
    const token = getToken()
    if (!token) return

    const input = {
      name: values.name,
      category: values.category || undefined,
      level: values.level || undefined,
      description: values.description || undefined,
      priceTiers: values.priceTiers.map((tier) => ({ label: tier.label, price: Number(tier.price) })),
      joiningFee: values.joiningFee ? Number(values.joiningFee) : undefined,
      taxPercent: values.taxPercent ? Number(values.taxPercent) : undefined,
      visitLimit: values.visitLimit ? Number(values.visitLimit) : undefined,
      features: values.features.map((f) => f.value),
      isActive: values.isActive,
    }

    await toast
      .promise(
        editingId
          ? updateMembershipPlan(token, editingId, input)
          : createMembershipPlan(token, input),
        {
          loading: editingId ? "Saving changes…" : "Creating plan…",
          success: editingId ? "Plan updated." : "Plan created.",
          error: (err) => (err instanceof ApiError ? err.message : "Something went wrong. Try again."),
        }
      )
      .then(() => {
        setDialogOpen(false)
        loadPlans()
      })
      .catch(() => {
        // toast.promise already surfaced the error.
      })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Memberships</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage the plans members can sign up for.
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
          <Button onClick={openAddDialog}>
            <PlusIcon />
            Add plan
          </Button>
        </div>
      </div>

      {view === "table" ? (
        <DataTable
          columns={columns}
          data={plans}
          getRowId={(row) => row.id}
          isLoading={loading}
          emptyMessage="No membership plans yet."
          isFiltersEnable
          isSortListEnable
          isViewEnable
          enableColumnPinning
          onRowClick={openEditDialog}
        />
      ) : loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <PlanCardSkeleton key={i} />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="flex items-center justify-center rounded-lg border py-16 text-sm text-muted-foreground">
          No membership plans yet.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} onEdit={() => openEditDialog(plan)} />
          ))}
        </div>
      )}

      <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
        <SheetContent className="flex flex-col">
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex h-full flex-col overflow-hidden">
            <SheetHeader>
              <SheetTitle>{editingId ? "Edit plan" : "Add plan"}</SheetTitle>
              <SheetDescription>
                Name your own prices — e.g. Monthly, 3 Months, Yearly, or anything a PT plan needs.
              </SheetDescription>
            </SheetHeader>
            <FieldGroup className="flex-1 overflow-y-auto px-4 pb-4">
              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="name">Plan name</FieldLabel>
                <Input
                  id="name"
                  placeholder="Gold Membership"
                  aria-invalid={!!errors.name}
                  {...register("name")}
                />
                <FieldError errors={[errors.name]} />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="category">Category</FieldLabel>
                  <Input
                    id="category"
                    placeholder="e.g. Personal Training, General"
                    {...register("category")}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="level">Level</FieldLabel>
                  <Input id="level" placeholder="e.g. Basic, Premium" {...register("level")} />
                </Field>
              </div>

              <Field data-invalid={!!errors.visitLimit}>
                <FieldLabel htmlFor="visitLimit">Visit limit</FieldLabel>
                <Input
                  id="visitLimit"
                  inputMode="numeric"
                  placeholder="Unlimited"
                  aria-invalid={!!errors.visitLimit}
                  {...register("visitLimit")}
                />
                <FieldError errors={[errors.visitLimit]} />
              </Field>

              <Field>
                <FieldLabel htmlFor="description">Description</FieldLabel>
                <Textarea
                  id="description"
                  rows={2}
                  placeholder="A short summary shown to members"
                  {...register("description")}
                />
              </Field>

              <FieldSeparator />

              <Field>
                <FieldLabel>Pricing</FieldLabel>
                <FieldDescription>
                  Add as many price tiers as this plan needs — name each one however your gym
                  prices it.
                </FieldDescription>
                <div className="flex flex-col gap-2">
                  {priceTierFields.map((field, index) => (
                    <div key={field.id} className="flex items-start gap-2">
                      <div className="flex-1">
                        <Input
                          placeholder="e.g. Monthly, 3 Months, PT Yearly"
                          aria-invalid={!!errors.priceTiers?.[index]?.label}
                          {...register(`priceTiers.${index}.label` as const)}
                        />
                        <FieldError errors={[errors.priceTiers?.[index]?.label]} />
                      </div>
                      <div className="w-32">
                        <Input
                          inputMode="decimal"
                          placeholder="0.00"
                          aria-invalid={!!errors.priceTiers?.[index]?.price}
                          {...register(`priceTiers.${index}.price` as const)}
                        />
                        <FieldError errors={[errors.priceTiers?.[index]?.price]} />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removePriceTier(index)}
                        aria-label="Remove price"
                      >
                        <XIcon />
                      </Button>
                    </div>
                  ))}
                  <FieldError errors={[errors.priceTiers]} />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="self-start"
                    onClick={() => appendPriceTier({ label: "", price: "" })}
                  >
                    <PlusIcon />
                    Add price
                  </Button>
                </div>
              </Field>

              <FieldSeparator />

              <div className="grid grid-cols-2 gap-4">
                <Field data-invalid={!!errors.joiningFee}>
                  <FieldLabel htmlFor="joiningFee">Joining fee</FieldLabel>
                  <Input
                    id="joiningFee"
                    inputMode="decimal"
                    placeholder="0.00"
                    aria-invalid={!!errors.joiningFee}
                    {...register("joiningFee")}
                  />
                </Field>
                <Field data-invalid={!!errors.taxPercent}>
                  <FieldLabel htmlFor="taxPercent">Tax %</FieldLabel>
                  <Input
                    id="taxPercent"
                    inputMode="decimal"
                    placeholder="0"
                    aria-invalid={!!errors.taxPercent}
                    {...register("taxPercent")}
                  />
                </Field>
              </div>

              <FieldSeparator />

              <Field>
                <FieldLabel>Features & includes</FieldLabel>
                <div className="flex flex-col gap-2">
                  {featureFields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2">
                      <Input
                        placeholder="e.g. Access to all equipment"
                        aria-invalid={!!errors.features?.[index]?.value}
                        {...register(`features.${index}.value` as const)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeFeature(index)}
                        aria-label="Remove feature"
                      >
                        <XIcon />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="self-start"
                    onClick={() => appendFeature({ value: "" })}
                  >
                    <PlusIcon />
                    Add feature
                  </Button>
                </div>
              </Field>

              <FieldSeparator />

              <Field orientation="horizontal">
                <div className="flex-1">
                  <FieldLabel htmlFor="isActive">Active</FieldLabel>
                  <FieldDescription>
                    Inactive plans stay saved but aren&apos;t offered to new members.
                  </FieldDescription>
                </div>
                <Controller
                  control={control}
                  name="isActive"
                  render={({ field }) => (
                    <Switch id="isActive" checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
              </Field>
            </FieldGroup>
            <SheetFooter className="border-t">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Spinner />}
                {isSubmitting ? "Saving…" : editingId ? "Save changes" : "Add plan"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
