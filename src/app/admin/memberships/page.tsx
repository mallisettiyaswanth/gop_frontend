"use client"

import { useEffect, useState } from "react"
import { Controller, useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { PlusIcon, XIcon, CheckIcon, PencilIcon } from "lucide-react"
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

const planSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    level: z.string(),
    description: z.string(),
    dailyPrice: optionalAmount,
    monthlyPrice: optionalAmount,
    yearlyPrice: optionalAmount,
    joiningFee: optionalAmount,
    taxPercent: optionalAmount,
    visitLimit: optionalWholeNumber,
    features: z.array(z.object({ value: z.string().min(1, "Feature can't be empty") })),
    isActive: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (!data.dailyPrice && !data.monthlyPrice && !data.yearlyPrice) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Set at least one price (daily, monthly, or yearly)",
        path: ["monthlyPrice"],
      })
    }
  })

type PlanFormValues = z.infer<typeof planSchema>

const emptyValues: PlanFormValues = {
  name: "",
  level: "",
  description: "",
  dailyPrice: "",
  monthlyPrice: "",
  yearlyPrice: "",
  joiningFee: "",
  taxPercent: "",
  visitLimit: "",
  features: [],
  isActive: true,
}

function formatCurrency(value: string) {
  const n = Number(value)
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

function PlanCard({ plan, onEdit }: { plan: MembershipPlan; onEdit: () => void }) {
  const hasExtras = Number(plan.joiningFee) > 0 || Number(plan.taxPercent) > 0 || plan.visitLimit != null

  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold">{plan.name}</h3>
            {plan.level && <Badge variant="secondary">{plan.level}</Badge>}
          </div>
          {plan.description && (
            <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
          )}
        </div>
        <Badge variant={plan.isActive ? "success-light" : "destructive-light"} className="shrink-0">
          {plan.isActive ? "Active" : "Inactive"}
        </Badge>
      </div>

      <div className="flex flex-col gap-1 border-t pt-3">
        {plan.monthlyPrice && (
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Monthly</span>
            <span className="text-xl font-semibold">₹{formatCurrency(plan.monthlyPrice)}</span>
          </div>
        )}
        {plan.yearlyPrice && (
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Yearly</span>
            <span className="text-xl font-semibold">₹{formatCurrency(plan.yearlyPrice)}</span>
          </div>
        )}
        {plan.dailyPrice && (
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Daily</span>
            <span className="text-xl font-semibold">₹{formatCurrency(plan.dailyPrice)}</span>
          </div>
        )}
      </div>

      {hasExtras && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {Number(plan.joiningFee) > 0 && <span>Joining fee ₹{formatCurrency(plan.joiningFee)}</span>}
          {Number(plan.taxPercent) > 0 && <span>Tax {plan.taxPercent}%</span>}
          {plan.visitLimit != null && <span>{plan.visitLimit} visits/month</span>}
        </div>
      )}

      {plan.features.length > 0 && (
        <ul className="flex flex-col gap-1.5 border-t pt-3 text-sm">
          {plan.features.map((feature, i) => (
            <li key={i} className="flex items-start gap-2">
              <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-primary" />
              <span>{feature}</span>
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
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-5">
      <div className="flex items-start justify-between gap-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-5 w-16" />
      </div>
      <div className="flex flex-col gap-2 border-t pt-3">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
      </div>
    </div>
  )
}

export default function MembershipsPage() {
  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

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

  const { fields, append, remove } = useFieldArray({ control, name: "features" })

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
      level: plan.level ?? "",
      description: plan.description ?? "",
      dailyPrice: plan.dailyPrice ?? "",
      monthlyPrice: plan.monthlyPrice ?? "",
      yearlyPrice: plan.yearlyPrice ?? "",
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
      level: values.level || undefined,
      description: values.description || undefined,
      dailyPrice: values.dailyPrice ? Number(values.dailyPrice) : undefined,
      monthlyPrice: values.monthlyPrice ? Number(values.monthlyPrice) : undefined,
      yearlyPrice: values.yearlyPrice ? Number(values.yearlyPrice) : undefined,
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
        <Button onClick={openAddDialog}>
          <PlusIcon />
          Add plan
        </Button>
      </div>

      {loading ? (
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
                Set pricing and what&apos;s included. At least one of daily, monthly, or yearly
                price is required.
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
                  <FieldLabel htmlFor="level">Level</FieldLabel>
                  <Input id="level" placeholder="e.g. Basic, Premium" {...register("level")} />
                </Field>
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
              </div>

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
              <FieldDescription>Pricing — set any combination.</FieldDescription>

              <div className="grid grid-cols-3 gap-4">
                <Field data-invalid={!!errors.dailyPrice}>
                  <FieldLabel htmlFor="dailyPrice">Daily</FieldLabel>
                  <Input
                    id="dailyPrice"
                    inputMode="decimal"
                    placeholder="0.00"
                    aria-invalid={!!errors.dailyPrice}
                    {...register("dailyPrice")}
                  />
                </Field>
                <Field data-invalid={!!errors.monthlyPrice}>
                  <FieldLabel htmlFor="monthlyPrice">Monthly</FieldLabel>
                  <Input
                    id="monthlyPrice"
                    inputMode="decimal"
                    placeholder="0.00"
                    aria-invalid={!!errors.monthlyPrice}
                    {...register("monthlyPrice")}
                  />
                </Field>
                <Field data-invalid={!!errors.yearlyPrice}>
                  <FieldLabel htmlFor="yearlyPrice">Yearly</FieldLabel>
                  <Input
                    id="yearlyPrice"
                    inputMode="decimal"
                    placeholder="0.00"
                    aria-invalid={!!errors.yearlyPrice}
                    {...register("yearlyPrice")}
                  />
                </Field>
              </div>
              <FieldError errors={[errors.monthlyPrice]} />

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
                  {fields.map((field, index) => (
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
                        onClick={() => remove(index)}
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
                    onClick={() => append({ value: "" })}
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
