"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Field, FieldGroup, FieldLabel, FieldError, FieldDescription, FieldSeparator } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { updateOwnCredentials, ApiError } from "@/lib/api"
import { getToken } from "@/lib/auth-storage"

const credentialsSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.union([z.literal(""), z.string().min(8, "Password must be at least 8 characters")]),
    newPin: z.union([z.literal(""), z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits")]),
  })
  .refine((values) => values.newPassword || values.newPin, {
    message: "Enter a new password or a new PIN",
    path: ["newPassword"],
  })

type CredentialsValues = z.infer<typeof credentialsSchema>

export default function SecuritySettingsPage() {
  const [formError, setFormError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CredentialsValues>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { currentPassword: "", newPassword: "", newPin: "" },
  })

  async function onSubmit(values: CredentialsValues) {
    const token = getToken()
    if (!token) return
    setFormError(null)
    setSaved(false)
    try {
      await updateOwnCredentials(token, {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword || undefined,
        newPin: values.newPin || undefined,
      })
      setSaved(true)
      reset()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Something went wrong. Try again.")
    }
  }

  return (
    <div className="max-w-lg">
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <FieldGroup>
          {formError && (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          {saved && (
            <Alert>
              <AlertDescription>Your credentials have been updated.</AlertDescription>
            </Alert>
          )}
          <Field data-invalid={!!errors.currentPassword}>
            <FieldLabel htmlFor="currentPassword">Current password</FieldLabel>
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              aria-invalid={!!errors.currentPassword}
              {...register("currentPassword")}
            />
            <FieldError errors={[errors.currentPassword]} />
          </Field>
          <FieldSeparator />
          <FieldDescription>Change your password, your PIN, or both.</FieldDescription>
          <Field data-invalid={!!errors.newPassword}>
            <FieldLabel htmlFor="newPassword">New password</FieldLabel>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors.newPassword}
              {...register("newPassword")}
            />
            <FieldError errors={[errors.newPassword]} />
          </Field>
          <Field data-invalid={!!errors.newPin}>
            <FieldLabel htmlFor="newPin">New PIN</FieldLabel>
            <Input
              id="newPin"
              inputMode="numeric"
              maxLength={4}
              aria-invalid={!!errors.newPin}
              {...register("newPin")}
            />
            <FieldError errors={[errors.newPin]} />
          </Field>
        </FieldGroup>
        <div className="mt-6">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Spinner />}
            {isSubmitting ? "Updating…" : "Update credentials"}
          </Button>
        </div>
      </form>
    </div>
  )
}
