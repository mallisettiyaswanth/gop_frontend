"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Dumbbell } from "lucide-react"
import { GrainGradient } from "@paper-design/shaders-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Spinner } from "@/components/ui/spinner"
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
    <section className="min-h-screen bg-white p-3 text-black antialiased [font-synthesis:none] dark:bg-[#050505] dark:text-white">
      <div className="grid min-h-[calc(100vh-1.5rem)] gap-6 lg:grid-cols-[0.94fr_1.06fr]">
        <div className="flex min-h-[600px] items-center rounded-md border border-black/20 bg-white px-6 py-12 sm:px-10 dark:border-white/10 dark:bg-[#0a0a0a] lg:min-h-0 lg:px-14 xl:px-20">
          <div className="mx-auto w-full max-w-[440px]">
            <Link
              href="/"
              className="flex items-center gap-2 text-sm text-black/50 hover:text-black dark:text-white/45 dark:hover:text-white"
            >
              <Dumbbell className="size-4" />
              My Gym
            </Link>

            <h1 className="mt-8 text-3xl font-medium tracking-[-0.04em] sm:text-4xl lg:text-[42px] lg:leading-[1.05]">
              Admin login
            </h1>
            <p className="mt-3 text-lg leading-snug text-black/60 dark:text-white/55">
              Sign in with your gym account to continue.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-10 space-y-5">
              {formError && (
                <div className="rounded-[10px] border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                  {formError}
                </div>
              )}

              <div>
                <label
                  htmlFor="email"
                  className="flex h-14 items-center gap-4 rounded-[10px] border border-black/25 bg-white px-5 text-lg leading-none focus-within:border-black/60 dark:border-white/15 dark:bg-white/5 dark:focus-within:border-white/50"
                >
                  <span className="w-20 shrink-0 text-black dark:text-white">Email</span>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    aria-invalid={!!errors.email}
                    className="min-w-0 flex-1 truncate bg-transparent text-right outline-none placeholder:text-black/30 dark:placeholder:text-white/35"
                    {...register("email")}
                  />
                </label>
                {errors.email && (
                  <p className="mt-1.5 px-1 text-sm text-red-600 dark:text-red-400">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="flex h-14 items-center gap-4 rounded-[10px] border border-black/25 bg-white px-5 text-lg leading-none focus-within:border-black/60 dark:border-white/15 dark:bg-white/5 dark:focus-within:border-white/50"
                >
                  <span className="w-20 shrink-0 text-black dark:text-white">Password</span>
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    aria-invalid={!!errors.password}
                    className="min-w-0 flex-1 truncate bg-transparent text-right outline-none placeholder:text-black/30 dark:placeholder:text-white/35"
                    {...register("password")}
                  />
                </label>
                {errors.password && (
                  <p className="mt-1.5 px-1 text-sm text-red-600 dark:text-red-400">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-9 flex h-12 w-full items-center justify-center gap-2 rounded-[10px] border border-black/40 bg-black text-xl font-medium text-white transition-colors hover:bg-black/85 disabled:pointer-events-none disabled:opacity-60 dark:border-white/40 dark:bg-white dark:text-black dark:hover:bg-white/85"
              >
                {isSubmitting && <Spinner />}
                {isSubmitting ? "Signing in…" : "Sign in"}
              </button>
            </form>
          </div>
        </div>

        <div className="relative flex min-h-[500px] overflow-hidden rounded-md bg-black p-8 text-white sm:p-12 lg:min-h-0">
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
            className="absolute inset-0 bg-black"
          />

          <div className="relative z-10 flex h-full w-full flex-col justify-end">
            <h2 className="max-w-[520px] text-4xl font-medium tracking-[-0.05em] text-white sm:text-5xl lg:text-[56px] lg:leading-[1.02]">
              Everything your gym needs, in one place.
            </h2>
            <p className="mt-4 max-w-md text-base text-white/60 sm:text-lg">
              Members, memberships, attendance, and payments — built for how a real gym runs.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
