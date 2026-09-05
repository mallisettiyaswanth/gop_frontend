"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { SettingsSection, SettingsRow, SettingsFieldError } from "@/components/settings/settings-row"
import { ThemeToggleGroup } from "@/components/settings/theme-toggle-group"
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

export function GeneralSettingsForm() {
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
      <div className="flex flex-col gap-4">
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
    )
  }

  return (
    <div>
      {loadError && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {formError && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
        {saved && (
          <Alert className="mb-4">
            <AlertDescription>Gym settings saved.</AlertDescription>
          </Alert>
        )}

        <SettingsSection title="Gym profile">
          {!canEdit && (
            <p className="pb-2 text-sm text-muted-foreground">
              Only a Super Admin can change gym settings. You can view them here.
            </p>
          )}
          <SettingsRow label="Gym name" htmlFor="name">
            <Input
              id="name"
              placeholder="My Gym"
              disabled={!canEdit}
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            <SettingsFieldError message={errors.name?.message} />
          </SettingsRow>
          <SettingsRow label="Phone" htmlFor="phone">
            <Input id="phone" placeholder="+91 98765 43210" disabled={!canEdit} {...register("phone")} />
            <SettingsFieldError message={errors.phone?.message} />
          </SettingsRow>
          <SettingsRow label="Email" htmlFor="email">
            <Input
              id="email"
              type="email"
              placeholder="gym@example.com"
              disabled={!canEdit}
              aria-invalid={!!errors.email}
              {...register("email")}
            />
            <SettingsFieldError message={errors.email?.message} />
          </SettingsRow>
          <SettingsRow label="GST number" htmlFor="gstNumber">
            <Input id="gstNumber" placeholder="22AAAAA0000A1Z5" disabled={!canEdit} {...register("gstNumber")} />
            <SettingsFieldError message={errors.gstNumber?.message} />
          </SettingsRow>
          <SettingsRow label="Timezone" htmlFor="timezone">
            <Input id="timezone" placeholder="Asia/Kolkata" disabled={!canEdit} {...register("timezone")} />
            <SettingsFieldError message={errors.timezone?.message} />
          </SettingsRow>
          <SettingsRow label="Currency" htmlFor="currency">
            <Input id="currency" placeholder="INR" disabled={!canEdit} {...register("currency")} />
            <SettingsFieldError message={errors.currency?.message} />
          </SettingsRow>
          <SettingsRow label="Address" htmlFor="address" stacked>
            <Textarea
              id="address"
              placeholder="Street, city, state, ZIP"
              disabled={!canEdit}
              rows={3}
              {...register("address")}
            />
            <SettingsFieldError message={errors.address?.message} />
          </SettingsRow>
        </SettingsSection>

        {canEdit && (
          <div className="mt-6">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner />}
              {isSubmitting ? "Saving…" : "Save changes"}
            </Button>
          </div>
        )}
      </form>

      <SettingsSection title="Preferences" className="mt-8">
        <SettingsRow label="Appearance" description="Choose how the app looks on this device.">
          <div className="flex justify-end">
            <ThemeToggleGroup />
          </div>
        </SettingsRow>
      </SettingsSection>
    </div>
  )
}
