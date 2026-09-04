import Link from "next/link"
import { Dumbbell, Users, CalendarCheck, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

const tags = [
  "MEMBERS",
  "ATTENDANCE",
  "PAYMENTS",
  "MEMBERSHIPS",
  "RENEWALS",
  "REPORTS",
]

const features = [
  {
    icon: Users,
    title: "Members",
    description: "Every profile, membership, and note in one searchable place.",
  },
  {
    icon: CalendarCheck,
    title: "Attendance",
    description: "Check-ins tracked automatically, so nothing gets missed.",
  },
  {
    icon: CreditCard,
    title: "Payments",
    description: "Dues, renewals, and receipts handled without the paperwork.",
  },
]

export default function LandingPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
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

      <main className="flex flex-1 flex-col">
        <section className="flex flex-col items-center px-6 pt-20 pb-16 text-center sm:pt-28 sm:pb-24">
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
        </section>

        <div className="overflow-hidden border-y border-border/60 bg-card/50 py-4">
          <div className="flex w-max animate-marquee gap-10 text-sm font-medium tracking-wide text-muted-foreground">
            {[...tags, ...tags].map((tag, i) => (
              <span key={i} className="flex items-center gap-10 whitespace-nowrap">
                {tag}
                <span className="text-primary">✦</span>
              </span>
            ))}
          </div>
        </div>

        <section className="mx-auto grid w-full max-w-6xl gap-4 px-6 py-16 sm:grid-cols-3 sm:px-10 sm:py-24">
          {features.map(({ icon: Icon, title, description }) => (
            <Card key={title}>
              <CardHeader>
                <Icon className="size-5 text-primary" />
                <CardTitle className="mt-3">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </section>
      </main>

      <footer className="border-t border-border/60 px-6 py-6 text-center text-xs text-muted-foreground sm:px-10">
        © {new Date().getFullYear()} My Gym
      </footer>
    </div>
  )
}
