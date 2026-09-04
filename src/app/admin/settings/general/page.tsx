"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Field, FieldGroup, FieldLabel, FieldError, FieldDescription } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { getGymSettings, updateGymSettings, ApiError } from "@/lib/api"
import { getStoredUser, getToken } from "@/lib/auth-storage"

const gymSettingsSchema = z.object({
  name: z.string().min(1, "Gym name is required"),
  address: z.string(),
  phone: z.string(),
  email: z.union([z.literal(""), z.string().email("Enter a valid email address")]),
  gstNumber: z.string(),
  timezone: z.string().min(1, "Timezone is required"),
  currency: z.string().min(1, "Currency is required"),
})

type GymSettingsValues = z.infer<typeof gymSettingsSchema>

export default function GeneralSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const canEdit = getStoredUser()?.role === "SUPER_ADMIN"

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GymSettingsValues>({
    resolver: zodResolver(gymSettingsSchema),
    defaultValues: {
      name: "",
      address: "",
      phone: "",
      email: "",
      gstNumber: "",
      timezone: "",
      currency: "",
    },
  })

  useEffect(() => {
    async function load() {
      const token = getToken()
      if (!token) return
      setLoading(true)
      setLoadError(null)
      try {
        const settings = await getGymSettings(token)
        reset({
          name: settings.name,
          address: settings.address ?? "",
          phone: settings.phone ?? "",
          email: settings.email ?? "",
          gstNumber: settings.gstNumber ?? "",
          timezone: settings.timezone,
          currency: settings.currency,
        })
      } catch (err) {
        setLoadError(err instanceof ApiError ? err.message : "Couldn't load gym settings.")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [reset])

  async function onSubmit(values: GymSettingsValues) {
    const token = getToken()
    if (!token) return
    setFormError(null)
    setSaved(false)
    try {
      await updateGymSettings(token, {
        name: values.name,
        address: values.address || undefined,
        phone: values.phone || undefined,
        email: values.email || undefined,
        gstNumber: values.gstNumber || undefined,
        timezone: values.timezone,
        currency: values.currency,
      })
      setSaved(true)
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Something went wrong. Try again.")
    }
  }

  if (loading) {
    return (
      <div className="flex max-w-lg flex-col gap-6">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    )
  }

  return (
    <div className="max-w-lg">
      {loadError && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <FieldGroup>
          {formError && (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          {saved && (
            <Alert>
              <AlertDescription>Gym settings saved.</AlertDescription>
            </Alert>
          )}
          {!canEdit && (
            <FieldDescription>
              Only a Super Admin can change gym settings. You can view them here.
            </FieldDescription>
          )}
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor="name">Gym name</FieldLabel>
            <Input id="name" disabled={!canEdit} aria-invalid={!!errors.name} {...register("name")} />
            <FieldError errors={[errors.name]} />
          </Field>
          <Field data-invalid={!!errors.address}>
            <FieldLabel htmlFor="address">Address</FieldLabel>
            <Textarea id="address" disabled={!canEdit} rows={3} {...register("address")} />
            <FieldError errors={[errors.address]} />
          </Field>
          <Field data-invalid={!!errors.phone}>
            <FieldLabel htmlFor="phone">Phone</FieldLabel>
            <Input id="phone" disabled={!canEdit} {...register("phone")} />
            <FieldError errors={[errors.phone]} />
          </Field>
          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              disabled={!canEdit}
              aria-invalid={!!errors.email}
              {...register("email")}
            />
            <FieldError errors={[errors.email]} />
          </Field>
          <Field data-invalid={!!errors.gstNumber}>
            <FieldLabel htmlFor="gstNumber">GST number</FieldLabel>
            <Input id="gstNumber" disabled={!canEdit} {...register("gstNumber")} />
            <FieldError errors={[errors.gstNumber]} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field data-invalid={!!errors.timezone}>
              <FieldLabel htmlFor="timezone">Timezone</FieldLabel>
              <Input id="timezone" disabled={!canEdit} {...register("timezone")} />
              <FieldError errors={[errors.timezone]} />
            </Field>
            <Field data-invalid={!!errors.currency}>
              <FieldLabel htmlFor="currency">Currency</FieldLabel>
              <Input id="currency" disabled={!canEdit} {...register("currency")} />
              <FieldError errors={[errors.currency]} />
            </Field>
          </div>
        </FieldGroup>
        {canEdit && (
          <div className="mt-6">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner />}
              {isSubmitting ? "Saving…" : "Save changes"}
            </Button>
          </div>
        )}
      </form>
    </div>
  )
}
