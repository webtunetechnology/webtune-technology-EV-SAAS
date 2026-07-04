import Link from 'next/link'
import { ArrowRight, BadgeCheck, TrendingUp, Package, IndianRupee } from 'lucide-react'

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      {/* subtle brand wash */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-gradient-to-b from-primary/8 to-transparent"
      />
      <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pb-20 sm:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="flex h-2 w-2 rounded-full bg-secondary" aria-hidden="true" />
            Built for India&apos;s EV retail boom
          </span>

          <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl md:text-6xl">
            The operating system for{' '}
            <span className="text-primary">EV dealerships</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
            Manage your vehicle catalog, live inventory, customers, GST invoicing, service
            records and sales analytics — all from one showroom dashboard built for electric
            vehicles.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto"
            >
              Start 14-day free trial
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted sm:w-auto"
            >
              Sign in to dashboard
            </Link>
          </div>

          <p className="mt-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <BadgeCheck className="h-4 w-4 text-secondary" aria-hidden="true" />
            No credit card required · Cancel anytime
          </p>
        </div>

        {/* Product mockup */}
        <div className="mx-auto mt-14 max-w-5xl">
          <div className="rounded-2xl border border-border bg-card p-2 shadow-2xl shadow-primary/5">
            <div className="rounded-xl border border-border bg-background">
              {/* window bar */}
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <span className="h-3 w-3 rounded-full bg-destructive/60" />
                <span className="h-3 w-3 rounded-full bg-secondary/60" />
                <span className="h-3 w-3 rounded-full bg-muted-foreground/30" />
                <span className="ml-3 text-xs text-muted-foreground">
                  Voltline · WEB EV Showroom
                </span>
              </div>

              <div className="grid gap-4 p-4 sm:p-6 md:grid-cols-3">
                <KpiCard
                  icon={<IndianRupee className="h-4 w-4" />}
                  label="Revenue (MTD)"
                  value="₹42.6L"
                  trend="+18.2%"
                />
                <KpiCard
                  icon={<Package className="h-4 w-4" />}
                  label="Vehicles in stock"
                  value="128"
                  trend="24 available"
                />
                <KpiCard
                  icon={<TrendingUp className="h-4 w-4" />}
                  label="Invoices this month"
                  value="86"
                  trend="+12 vs last"
                />

                {/* Chart */}
                <div className="rounded-xl border border-border bg-card p-4 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">Sales trend</p>
                    <span className="text-xs text-muted-foreground">Last 7 months</span>
                  </div>
                  <div className="mt-5 flex h-32 items-end gap-2 sm:gap-3">
                    {[38, 52, 44, 66, 58, 80, 72].map((h, i) => (
                      <div key={i} className="flex flex-1 flex-col items-center gap-2">
                        <div
                          className="w-full rounded-t-md bg-primary/80"
                          style={{ height: `${h}%` }}
                        />
                        <span className="text-[10px] text-muted-foreground">
                          {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'][i]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent inventory */}
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-sm font-medium text-foreground">Recent stock</p>
                  <ul className="mt-4 space-y-3">
                    {[
                      { m: 'Ather 450 Apex', s: 'Available' },
                      { m: 'Ola S1 Pro', s: 'Reserved' },
                      { m: 'TVS iQube', s: 'Sold' },
                    ].map((row) => (
                      <li key={row.m} className="flex items-center justify-between">
                        <span className="text-xs font-medium text-foreground">{row.m}</span>
                        <StatusPill status={row.s} />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function KpiCard({
  icon,
  label,
  value,
  trend,
}: {
  icon: React.ReactNode
  label: string
  value: string
  trend: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
          {icon}
        </span>
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-xs font-medium text-secondary">{trend}</p>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Available: 'bg-secondary/15 text-secondary',
    Reserved: 'bg-primary/10 text-primary',
    Sold: 'bg-muted text-muted-foreground',
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${styles[status] ?? ''}`}>
      {status}
    </span>
  )
}
