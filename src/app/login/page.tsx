"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Dumbbell } from "lucide-react"
import { GrainGradient } from "@paper-design/shaders-react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { ThemeToggle } from "@/components/theme-toggle"
import { loginWithPassword, loginWithPin, ApiError } from "@/lib/api"
import { saveSession } from "@/lib/auth-storage"

const loginSchema = z
  .object({
    email: z.string().min(1, "Email is required").email("Enter a valid email address"),
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

type LoginValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", mode: "password", password: "", pin: "" },
  })

  const mode = watch("mode")

  async function onSubmit(values: LoginValues) {
    setFormError(null)
    try {
      const result =
        values.mode === "password"
          ? await loginWithPassword(values.email, values.password!)
          : await loginWithPin(values.email, values.pin!)
      saveSession(result.accessToken, result.user)
      router.push("/admin")
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Something went wrong. Try again.")
    }
  }

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
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

        <div className="w-full max-w-sm">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <Dumbbell className="size-4" />
            My Gym
          </Link>

          <h1 className="mt-6 text-2xl font-semibold tracking-tight">Welcome!</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Please enter your details to login.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8">
            <FieldGroup>
              {formError && (
                <Alert variant="destructive">
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}
              <Field data-invalid={!!errors.email}>
                <FieldLabel htmlFor="email">Email address</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="Enter your email address"
                  aria-invalid={!!errors.email}
                  {...register("email")}
                />
                <FieldError errors={[errors.email]} />
              </Field>

              <Tabs
                value={mode}
                onValueChange={(value) => {
                  setValue("mode", value as "password" | "pin")
                  setValue("password", "")
                  setValue("pin", "")
                }}
              >
                <TabsList className="w-full">
                  <TabsTrigger value="password" className="flex-1">
                    Password
                  </TabsTrigger>
                  <TabsTrigger value="pin" className="flex-1">
                    PIN
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="password" className="mt-4">
                  <Field data-invalid={!!errors.password}>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <Input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      aria-invalid={!!errors.password}
                      {...register("password")}
                    />
                    <FieldError errors={[errors.password]} />
                  </Field>
                </TabsContent>

                <TabsContent value="pin" className="mt-4">
                  <Field data-invalid={!!errors.pin}>
                    <FieldLabel htmlFor="pin">4-digit PIN</FieldLabel>
                    <Controller
                      control={control}
                      name="pin"
                      render={({ field }) => (
                        <InputOTP
                          maxLength={4}
                          inputMode="numeric"
                          value={field.value ?? ""}
                          onChange={field.onChange}
                        >
                          <InputOTPGroup>
                            <InputOTPSlot index={0} />
                            <InputOTPSlot index={1} />
                            <InputOTPSlot index={2} />
                            <InputOTPSlot index={3} />
                          </InputOTPGroup>
                        </InputOTP>
                      )}
                    />
                    <FieldError errors={[errors.pin]} />
                  </Field>
                </TabsContent>
              </Tabs>

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting && <Spinner />}
                {isSubmitting ? "Signing in…" : "Log In"}
              </Button>
            </FieldGroup>
          </form>
        </div>
      </div>
    </div>
  )
}
