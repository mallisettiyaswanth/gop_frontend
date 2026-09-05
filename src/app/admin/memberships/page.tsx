"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { PlusIcon, XIcon, CheckIcon, PencilIcon, UsersIcon } from "lucide-react"
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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { cn } from "@/lib/utils"

const optionalAmount = z.union([
  z.literal(""),
  z.string().regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount"),
])
const optionalWholeNumber = z.union([z.literal(""), z.string().regex(/^\d+$/, "Enter a whole number")])

const optionalColor = z.union([
  z.literal(""),
  z.string().regex(/^#[0-9a-fA-F]{6}$/, "Enter a hex color like #22c55e"),
])

const planSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string(),
  level: z.string(),
  color: optionalColor,
  description: z.string(),
  priceTiers: z
    .array(
      z.object({
        label: z.string().min(1, "Name this price"),
        price: z.string().regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount"),
        durationDays: z.string().regex(/^[1-9]\d*$/, "Enter days"),
      })
    )
    .min(1, "Add at least one price"),
  highlightedTier: z.string(),
  includesPlanId: z.string(),
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
  color: "",
  description: "",
  priceTiers: [{ label: "Monthly", price: "", durationDays: "30" }],
  highlightedTier: "",
  includesPlanId: "",
  joiningFee: "",
  taxPercent: "",
  visitLimit: "",
  features: [],
  isActive: true,
}

function formatCurrency(value: number | string) {
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })
}

/**
 * Pricing block: a tab per tier (shortest first). The shortest is the base
 * rate everything else is measured against, so switching to a longer tier
 * shows what it would have cost at that base rate (crossed out) next to what
 * it actually costs, plus the resulting "Save N%". The plan's configured
 * `highlightedTier` is both the default-selected tab and carries a small dot
 * so it still reads as "the one to pick" even after switching away.
 */
function PlanPricing({ plan }: { plan: MembershipPlan }) {
  const sortedTiers = [...plan.priceTiers].sort((a, b) => a.durationDays - b.durationDays)
  const base = sortedTiers[0]

  const defaultLabel =
    plan.highlightedTier && sortedTiers.some((tier) => tier.label === plan.highlightedTier)
      ? plan.highlightedTier
      : (base?.label ?? "")
  const [selectedLabel, setSelectedLabel] = useState(defaultLabel)

  if (!base) return null
  const selected = sortedTiers.find((tier) => tier.label === selectedLabel) ?? base
  const isBase = selected.label === base.label
  // Every tier's price is normalized to a monthly rate so the headline
  // number always means the same thing ("what would I pay per month"),
  // whichever tab is selected — 3/6-month tiers just usually normalize to
  // a lower rate, which is what the savings badge is measuring.
  const monthlyRate = (selected.price * 30) / selected.durationDays
  const baseMonthlyRate = (base.price * 30) / base.durationDays
  const savingsPercent =
    !isBase && baseMonthlyRate > 0
      ? Math.round(((baseMonthlyRate - monthlyRate) / baseMonthlyRate) * 100)
      : 0
  const hasSavings = savingsPercent > 0

  return (
    <div className="flex flex-col gap-3">
      {sortedTiers.length > 1 && (
        <div className="flex gap-1 pt-2.5">
          {sortedTiers.map((tier) => {
            const isSelected = tier.label === selectedLabel
            const isHighlighted = tier.label === plan.highlightedTier
            return (
              <div key={tier.label} className="relative flex-1">
                {isHighlighted && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] leading-none font-semibold whitespace-nowrap text-white">
                    Popular
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedLabel(tier.label)}
                  className={cn(
                    "w-full rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                    isSelected
                      ? isHighlighted
                        ? "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/50 dark:text-emerald-400"
                        : "bg-muted text-foreground"
                      : isHighlighted
                        ? "bg-emerald-500/5 text-emerald-700 ring-1 ring-emerald-500/30 hover:bg-emerald-500/10 dark:text-emerald-400"
                        : "bg-muted/50 text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tier.label}
                </button>
              </div>
            )
          })}
        </div>
      )}

      <div className="flex flex-col gap-0.5">
        <div className="flex flex-wrap items-end gap-2">
          <span className="text-3xl font-bold tracking-tight">
            ₹{formatCurrency(Math.round(monthlyRate))}
          </span>
          <span className="pb-1 text-sm text-muted-foreground">/month</span>
          {hasSavings && (
            <span className="mb-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              Save {savingsPercent}%
            </span>
          )}
        </div>
        {!isBase && (
          <span className="text-xs text-muted-foreground">
            Billed ₹{formatCurrency(selected.price)} every {selected.label.toLowerCase()}
          </span>
        )}
      </div>
    </div>
  )
}

function PlanCard({ plan, onEdit }: { plan: MembershipPlan; onEdit: () => void }) {
  const router = useRouter()
  const extras = [
    Number(plan.joiningFee) > 0 && `Joining fee ₹${formatCurrency(plan.joiningFee)}`,
    Number(plan.taxPercent) > 0 && `Tax ${plan.taxPercent}%`,
    plan.visitLimit != null && `${plan.visitLimit} visits/mo`,
  ].filter((extra): extra is string => !!extra)

  return (
    <div
      className="flex flex-col gap-4 rounded-xl border p-5 shadow-sm transition-shadow hover:shadow-md"
      style={plan.color ? { borderTopColor: plan.color, borderTopWidth: 3 } : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 truncate text-lg font-semibold">{plan.name}</h3>
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
        <PlanPricing plan={plan} />
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

      {(plan.includesPlan || plan.features.length > 0) && (
        <div className="flex flex-col gap-1.5 border-t border-border/40 pt-3 text-sm">
          {plan.includesPlan && (
            <div className="flex items-start gap-2 font-medium">
              <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-primary" />
              <span className="leading-snug">Everything in {plan.includesPlan.name}, plus:</span>
            </div>
          )}
          {plan.features.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  <span className="leading-snug">{feature}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/40 pt-3">
        <button
          type="button"
          onClick={() => router.push(`/admin/members?planId=${plan.id}`)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <UsersIcon className="size-4" />
          {plan.memberCount} {plan.memberCount === 1 ? "member" : "members"}
        </button>
        <Button variant="outline" size="sm" onClick={onEdit}>
          <PencilIcon />
          Edit
        </Button>
      </div>
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

  const watchedPriceTiers = useWatch({ control, name: "priceTiers" })
  const tierLabelOptions = watchedPriceTiers
    .map((tier) => tier.label.trim())
    .filter((label, index, all) => label.length > 0 && all.indexOf(label) === index)

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
      color: plan.color ?? "",
      description: plan.description ?? "",
      priceTiers:
        plan.priceTiers.length > 0
          ? plan.priceTiers.map((tier) => ({
              label: tier.label,
              price: String(tier.price),
              durationDays: String(tier.durationDays),
            }))
          : [{ label: "Monthly", price: "", durationDays: "30" }],
      highlightedTier: plan.highlightedTier ?? "",
      includesPlanId: plan.includesPlanId ?? "",
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
      color: values.color || undefined,
      description: values.description || undefined,
      priceTiers: values.priceTiers.map((tier) => ({
        label: tier.label,
        price: Number(tier.price),
        durationDays: Number(tier.durationDays),
      })),
      highlightedTier: values.highlightedTier,
      includesPlanId: values.includesPlanId,
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

              <Field data-invalid={!!errors.color}>
                <FieldLabel htmlFor="color">Highlight color</FieldLabel>
                <FieldDescription>
                  Members on this plan are tinted this color in the members table.
                </FieldDescription>
                <Controller
                  control={control}
                  name="color"
                  render={({ field }) => (
                    <div className="flex items-center gap-2">
                      <Input
                        id="color"
                        type="color"
                        className="h-9 w-14 p-1"
                        value={field.value || "#22c55e"}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                      <Input
                        placeholder="#22c55e"
                        className="flex-1"
                        aria-invalid={!!errors.color}
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                      {field.value && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => field.onChange("")}
                          aria-label="Clear color"
                        >
                          <XIcon />
                        </Button>
                      )}
                    </div>
                  )}
                />
                <FieldError errors={[errors.color]} />
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
                  prices it, and set how many days that purchase keeps the membership valid for.
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
                      <div className="w-28">
                        <Input
                          inputMode="decimal"
                          placeholder="Price"
                          aria-invalid={!!errors.priceTiers?.[index]?.price}
                          {...register(`priceTiers.${index}.price` as const)}
                        />
                        <FieldError errors={[errors.priceTiers?.[index]?.price]} />
                      </div>
                      <div className="w-24">
                        <Input
                          inputMode="numeric"
                          placeholder="Days"
                          aria-invalid={!!errors.priceTiers?.[index]?.durationDays}
                          {...register(`priceTiers.${index}.durationDays` as const)}
                        />
                        <FieldError errors={[errors.priceTiers?.[index]?.durationDays]} />
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
                    onClick={() => appendPriceTier({ label: "", price: "", durationDays: "" })}
                  >
                    <PlusIcon />
                    Add price
                  </Button>
                </div>
              </Field>

              <Field>
                <FieldLabel htmlFor="highlightedTier">Highlighted tier</FieldLabel>
                <FieldDescription>
                  Which price is featured as the default/&quot;most popular&quot; one on the card.
                </FieldDescription>
                <Controller
                  control={control}
                  name="highlightedTier"
                  render={({ field }) => (
                    <Select
                      value={field.value || "none"}
                      onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
                    >
                      <SelectTrigger id="highlightedTier">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="none">None</SelectItem>
                          {tierLabelOptions.map((label) => (
                            <SelectItem key={label} value={label}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                />
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
                <FieldLabel htmlFor="includesPlanId">Includes plan</FieldLabel>
                <FieldDescription>
                  If this plan is a step up from another one, pick it here — the card will say
                  &quot;Everything in {"{that plan}"}, plus:&quot; instead of repeating its features.
                </FieldDescription>
                <Controller
                  control={control}
                  name="includesPlanId"
                  render={({ field }) => (
                    <Select
                      value={field.value || "none"}
                      onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
                    >
                      <SelectTrigger id="includesPlanId">
                        <SelectValue placeholder="None">
                          {(value: string) => plans.find((plan) => plan.id === value)?.name ?? "None"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="none">None</SelectItem>
                          {plans
                            .filter((plan) => plan.id !== editingId)
                            .map((plan) => (
                              <SelectItem key={plan.id} value={plan.id}>
                                {plan.name}
                              </SelectItem>
                            ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>

              <Field>
                <FieldLabel>Features</FieldLabel>
                <FieldDescription>
                  This plan&apos;s own features, on top of whatever the included plan already
                  covers.
                </FieldDescription>
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
