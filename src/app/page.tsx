import Link from "next/link"
import { Dumbbell } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function LandingPage() {
  return (
    <div className="bg-grid-dots flex min-h-full flex-1 flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 sm:px-10">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Dumbbell className="size-4 text-primary" />
            My Gym
          </span>
          <Button render={<Link href="/login" />} nativeButton={false} size="sm">
            Admin Login
          </Button>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          Member management, simplified
        </span>
        <h1 className="mt-6 max-w-3xl font-heading text-5xl leading-[1.05] font-bold tracking-tight text-balance sm:text-7xl">
          EVERYTHING YOUR <span className="text-primary">GYM NEEDS.</span>
        </h1>
        <p className="mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
          Members, memberships, attendance, and payments — all in one place, built for how a
          real gym actually runs day to day.
        </p>
        <div className="mt-8">
          <Button render={<Link href="/login" />} nativeButton={false} size="lg">
            Admin Login
          </Button>
        </div>
      </main>

      <footer className="border-t border-border/60 px-6 py-6 text-center text-xs text-muted-foreground sm:px-10">
        © {new Date().getFullYear()} My Gym
      </footer>
    </div>
  )
}
