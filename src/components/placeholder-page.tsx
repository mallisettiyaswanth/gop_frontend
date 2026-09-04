export function PlaceholderPage({
  title,
  description = "Coming soon.",
}: {
  title: string
  description?: string
}) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
