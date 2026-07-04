const stats = [
  { value: '5,000+', label: 'Vehicles managed per showroom' },
  { value: 'GST-ready', label: 'Compliant invoices in seconds' },
  { value: '100', label: 'Team members on Enterprise' },
  { value: '14 days', label: 'Free trial, no card needed' },
]

export function Stats() {
  return (
    <section className="border-b border-border bg-card">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px px-4 sm:px-6 md:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="px-2 py-8 text-center md:px-6">
            <p className="text-2xl font-semibold text-foreground sm:text-3xl">{stat.value}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
