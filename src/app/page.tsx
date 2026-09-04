import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function LandingPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <span className="text-base font-semibold">My Gym</span>
        <Button render={<Link href="/login" />} nativeButton={false} variant="outline" size="sm">
          Staff Login
        </Button>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Run your gym without the busywork
        </h1>
        <p className="mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
          Members, memberships, attendance, and payments — all in one place, built for how a real
          gym actually runs day to day.
        </p>
        <div className="mt-8">
          <Button render={<Link href="/login" />} nativeButton={false} size="lg">
            Staff Login
          </Button>
        </div>
      </main>

      <footer className="px-6 py-6 text-center text-xs text-muted-foreground sm:px-10">
        © {new Date().getFullYear()} My Gym
      </footer>
    </div>
  )
}
