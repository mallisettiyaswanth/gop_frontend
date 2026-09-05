"use client"

import { useEffect, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { CheckIcon, CircleIcon } from "lucide-react"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { SettingsSection, SettingsRow, SettingsFieldError } from "@/components/settings/settings-row"
import { getOwnProfile, updateOwnCredentials, ApiError } from "@/lib/api"
import { getToken } from "@/lib/auth-storage"

const passwordCriteria = [
  { key: "length", label: "8+ characters", test: (v: string) => v.length >= 8 },
  { key: "number", label: "1 number", test: (v: string) => /[0-9]/.test(v) },
  { key: "upper", label: "1 capital letter", test: (v: string) => /[A-Z]/.test(v) },
  { key: "special", label: "1 special character", test: (v: string) => /[^A-Za-z0-9]/.test(v) },
] as const

const strengthBarColor = ["bg-destructive/70", "bg-destructive/70", "bg-amber-500", "bg-amber-500", "bg-green-500"]

function meetsAllCriteria(value: string) {
  return passwordCriteria.every((criterion) => criterion.test(value))
}

const credentialsSchema = z
  .object({
    currentPassword: z.string(),
    newPassword: z.union([
      z.literal(""),
      z.string().refine(meetsAllCriteria, "Password doesn't meet all the requirements below"),
    ]),
    newPin: z.union([z.literal(""), z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits")]),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword && !data.currentPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Current password is required to change your password",
        path: ["currentPassword"],
      })
    }
  })

type CredentialsValues = z.infer<typeof credentialsSchema>

function PasswordStrengthHint({ value, visible }: { value: string; visible: boolean }) {
  if (!visible) return null

  const metCount = passwordCriteria.filter((criterion) => criterion.test(value)).length

  return (
    <div className="mt-2 flex animate-in flex-col gap-2 rounded-md border bg-muted/40 p-2.5 fade-in-0 slide-in-from-top-1 duration-150">
      <div className="flex gap-1">
        {passwordCriteria.map((criterion, index) => (
          <span
            key={criterion.key}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-200",
              index < metCount ? strengthBarColor[metCount] : "bg-border"
            )}
          />
        ))}
      </div>
      <ul className="flex flex-col gap-1">
        {passwordCriteria.map((criterion) => {
          const met = criterion.test(value)
          return (
            <li
              key={criterion.key}
              className={cn(
                "flex items-center gap-1.5 text-xs transition-colors",
                met ? "text-green-600 dark:text-green-500" : "text-muted-foreground"
              )}
            >
              {met ? <CheckIcon className="size-3 shrink-0" /> : <CircleIcon className="size-3 shrink-0" />}
              {criterion.label}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function SecuritySettingsForm() {
  const [loading, setLoading] = useState(true)
  const [hasPin, setHasPin] = useState(false)
  const [pinEnabled, setPinEnabled] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [newPasswordFocused, setNewPasswordFocused] = useState(false)
  const [newPasswordReadOnly, setNewPasswordReadOnly] = useState(true)

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CredentialsValues>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { currentPassword: "", newPassword: "", newPin: "" },
  })

  const newPasswordValue = watch("newPassword")
  const newPasswordField = register("newPassword")

  useEffect(() => {
    const token = getToken()
    if (!token) return
    getOwnProfile(token)
      .then((profile) => {
        setHasPin(profile.hasPin)
        setPinEnabled(profile.pinEnabled)
      })
      .catch(() => {
        // Leave the toggle at its default (off) — the form still works for password-only updates.
      })
      .finally(() => setLoading(false))
  }, [])

  async function onSubmit(values: CredentialsValues) {
    const token = getToken()
    if (!token) return
    setFormError(null)
    setSaved(false)

    if (pinEnabled && !hasPin && !values.newPin) {
      setError("newPin", { message: "Set a PIN to enable PIN login." })
      return
    }

    try {
      const profile = await updateOwnCredentials(token, {
        currentPassword: values.currentPassword || undefined,
        newPassword: values.newPassword || undefined,
        newPin: values.newPin || undefined,
        pinEnabled,
      })
      setHasPin(profile.hasPin)
      setPinEnabled(profile.pinEnabled)
      setSaved(true)
      reset()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Something went wrong. Try again.")
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {formError && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
        {saved && (
          <Alert className="mb-4">
            <AlertDescription>Your credentials have been updated.</AlertDescription>
          </Alert>
        )}

        <SettingsSection title="Password">
          <SettingsRow
            label="Current password"
            htmlFor="currentPassword"
            description="Only required when changing your password"
          >
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              aria-invalid={!!errors.currentPassword}
              {...register("currentPassword")}
            />
            <SettingsFieldError message={errors.currentPassword?.message} />
          </SettingsRow>
          <SettingsRow
            label="New password"
            htmlFor="newPassword"
            description="Leave blank to keep your current password"
            align="start"
          >
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              readOnly={newPasswordReadOnly}
              data-1p-ignore
              data-lpignore="true"
              placeholder="••••••••"
              aria-invalid={!!errors.newPassword}
              {...newPasswordField}
              onFocus={() => {
                setNewPasswordReadOnly(false)
                setNewPasswordFocused(true)
              }}
              onBlur={(e) => {
                newPasswordField.onBlur(e)
                setNewPasswordFocused(false)
              }}
            />
            <SettingsFieldError message={errors.newPassword?.message} />
            <PasswordStrengthHint value={newPasswordValue} visible={newPasswordFocused} />
          </SettingsRow>
        </SettingsSection>

        <SettingsSection title="PIN login" className="mt-6">
          <SettingsRow
            label="Enable PIN login"
            htmlFor="pinEnabled"
            description="Let this account sign in with a 4-digit PIN as well as a password."
          >
            <div className="flex justify-end">
              <Switch
                id="pinEnabled"
                checked={pinEnabled}
                onCheckedChange={(checked) => setPinEnabled(checked)}
                disabled={loading}
              />
            </div>
          </SettingsRow>
          <SettingsRow
            label={hasPin ? "Change PIN" : "Set PIN"}
            htmlFor="newPin"
            description={
              pinEnabled ? (hasPin ? "Leave blank to keep your current PIN" : "4 digits") : "Enable PIN login to set a PIN"
            }
          >
            <Controller
              control={control}
              name="newPin"
              render={({ field }) => (
                <div className="flex justify-end">
                  <InputOTP
                    id="newPin"
                    maxLength={4}
                    inputMode="numeric"
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    disabled={!pinEnabled}
                  >
                    <InputOTPGroup aria-invalid={!!errors.newPin}>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              )}
            />
            <SettingsFieldError message={errors.newPin?.message} />
          </SettingsRow>
        </SettingsSection>

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
