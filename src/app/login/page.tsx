"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { GrainGradient } from "@paper-design/shaders-react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { ThemeToggle } from "@/components/theme-toggle"
import { getLoginMethod, loginWithPassword, loginWithPin, ApiError } from "@/lib/api"
import { saveSession } from "@/lib/auth-storage"

const emailSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
})

type EmailValues = z.infer<typeof emailSchema>

const credentialSchema = z
  .object({
    mode: z.enum(["password", "pin"]),
    password: z.string().optional(),
    pin: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.mode === "password") {
      if (!data.password || data.password.length < 8) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Password must be at least 8 characters",
          path: ["password"],
        })
      }
    } else if (!data.pin || !/^\d{4}$/.test(data.pin)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter your 4-digit PIN",
        path: ["pin"],
      })
    }
  })

type CredentialValues = z.infer<typeof credentialSchema>

export default function LoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<"email" | "credential">("email")
  const [email, setEmail] = useState("")
  const [pinAvailable, setPinAvailable] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const emailForm = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  })

  const credentialForm = useForm<CredentialValues>({
    resolver: zodResolver(credentialSchema),
    defaultValues: { mode: "password", password: "", pin: "" },
  })

  const mode = credentialForm.watch("mode")

  function toggleMode() {
    credentialForm.setValue("mode", mode === "pin" ? "password" : "pin")
    credentialForm.setValue("password", "")
    credentialForm.setValue("pin", "")
    credentialForm.clearErrors()
  }

  async function onEmailSubmit(values: EmailValues) {
    setFormError(null)
    try {
      const { pinEnabled } = await getLoginMethod(values.email)
      setEmail(values.email)
      setPinAvailable(pinEnabled)
      credentialForm.reset({ mode: pinEnabled ? "pin" : "password", password: "", pin: "" })
      setStep("credential")
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Something went wrong. Try again.")
    }
  }

  function changeEmail() {
    setStep("email")
    setFormError(null)
    credentialForm.reset({ mode: "password", password: "", pin: "" })
  }

  async function onCredentialSubmit(values: CredentialValues) {
    setFormError(null)
    try {
      const result =
        values.mode === "password"
          ? await loginWithPassword(email, values.password!)
          : await loginWithPin(email, values.pin!)
      saveSession(result.accessToken, result.user)
      router.push("/admin")
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Something went wrong. Try again.")
    }
  }

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[3fr_2fr]">
      {/* Image placeholder — swap GrainGradient for a real photo later */}
      <div className="relative hidden overflow-hidden bg-black lg:block">
        <GrainGradient
          speed={1}
          scale={1}
          rotation={0}
          offsetX={0}
          offsetY={0}
          softness={0.6}
          intensity={0.4}
          noise={0.2}
          shape="corners"
          frame={2854.5}
          colors={["#FFFFFF", "#2A2A2A", "#1A1A1A", "#FFFFFF"]}
          colorBack="#000000"
          className="absolute inset-0"
        />
      </div>

      <div className="relative flex flex-col items-center justify-center px-6 py-16 sm:px-12">
        <div className="absolute top-6 right-6">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-sm -translate-y-12">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome!</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Please enter your details to login.
          </p>

          {step === "email" ? (
            <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} noValidate className="mt-8">
              <FieldGroup>
                {formError && (
                  <Alert variant="destructive">
                    <AlertDescription>{formError}</AlertDescription>
                  </Alert>
                )}
                <Field data-invalid={!!emailForm.formState.errors.email}>
                  <FieldLabel htmlFor="email">Email address</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="Enter your email address"
                    autoFocus
                    aria-invalid={!!emailForm.formState.errors.email}
                    {...emailForm.register("email")}
                  />
                  <FieldError errors={[emailForm.formState.errors.email]} />
                </Field>

                <Button type="submit" disabled={emailForm.formState.isSubmitting} className="w-full">
                  {emailForm.formState.isSubmitting && <Spinner />}
                  {emailForm.formState.isSubmitting ? "Checking…" : "Continue"}
                </Button>
              </FieldGroup>
            </form>
          ) : (
            <form
              onSubmit={credentialForm.handleSubmit(onCredentialSubmit)}
              noValidate
              className="mt-8"
            >
              <FieldGroup>
                {formError && (
                  <Alert variant="destructive">
                    <AlertDescription>{formError}</AlertDescription>
                  </Alert>
                )}
                <Field>
                  <div className="flex items-center justify-between">
                    <FieldLabel>Email address</FieldLabel>
                    <button
                      type="button"
                      onClick={changeEmail}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Change
                    </button>
                  </div>
                  <div className="truncate text-sm text-foreground">{email}</div>
                </Field>

                {mode === "pin" ? (
                  <Field data-invalid={!!credentialForm.formState.errors.pin}>
                    <div className="flex items-center justify-between">
                      <FieldLabel htmlFor="pin">4-digit PIN</FieldLabel>
                      {pinAvailable && (
                        <button
                          type="button"
                          onClick={toggleMode}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          Use password
                        </button>
                      )}
                    </div>
                    <Controller
                      control={credentialForm.control}
                      name="pin"
                      render={({ field }) => (
                        <InputOTP
                          id="pin"
                          maxLength={4}
                          inputMode="numeric"
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          autoFocus
                        >
                          <InputOTPGroup className="gap-2 *:data-[slot=input-otp-slot]:size-12 *:data-[slot=input-otp-slot]:rounded-lg *:data-[slot=input-otp-slot]:border">
                            <InputOTPSlot index={0} />
                            <InputOTPSlot index={1} />
                            <InputOTPSlot index={2} />
                            <InputOTPSlot index={3} />
                          </InputOTPGroup>
                        </InputOTP>
                      )}
                    />
                    <FieldError errors={[credentialForm.formState.errors.pin]} />
                  </Field>
                ) : (
                  <Field data-invalid={!!credentialForm.formState.errors.password}>
                    <div className="flex items-center justify-between">
                      <FieldLabel htmlFor="password">Password</FieldLabel>
                      {pinAvailable && (
                        <button
                          type="button"
                          onClick={toggleMode}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          Use PIN
                        </button>
                      )}
                    </div>
                    <Input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      autoFocus
                      aria-invalid={!!credentialForm.formState.errors.password}
                      {...credentialForm.register("password")}
                    />
                    <FieldError errors={[credentialForm.formState.errors.password]} />
                  </Field>
                )}

                <Button
                  type="submit"
                  disabled={credentialForm.formState.isSubmitting}
                  className="w-full"
                >
                  {credentialForm.formState.isSubmitting && <Spinner />}
                  {credentialForm.formState.isSubmitting ? "Signing in…" : "Log In"}
                </Button>
              </FieldGroup>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
