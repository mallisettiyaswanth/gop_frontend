"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Dumbbell } from "lucide-react"
import { GrainGradient } from "@paper-design/shaders-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field"
import { login, ApiError } from "@/lib/api"
import { saveSession } from "@/lib/auth-storage"

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

type LoginValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  async function onSubmit(values: LoginValues) {
    setFormError(null)
    try {
      const result = await login(values.email, values.password)
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

      <div className="flex flex-col items-center justify-center px-6 py-16 sm:px-12">
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

