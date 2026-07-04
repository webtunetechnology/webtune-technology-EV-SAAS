import {
  Car,
  Boxes,
  Users,
  FileText,
  BarChart3,
  Wrench,
  Ticket,
  ShieldCheck,
} from 'lucide-react'

const features = [
  {
    icon: Car,
    title: 'Vehicle catalog',
    desc: 'Maintain every model, variant, spec, range and price with a structured EV-first catalog.',
  },
  {
    icon: Boxes,
    title: 'Inventory tracking',
    desc: 'Track each unit by VIN, battery health, colour and stock status from arrival to sold.',
  },
  {
    icon: Users,
    title: 'Customer CRM',
    desc: 'Capture leads, KYC, addresses and purchase history in one organised customer record.',
  },
  {
    icon: FileText,
    title: 'GST invoicing',
    desc: 'Generate compliant on-road invoices with CGST/SGST, RTO and insurance auto-calculated.',
  },
  {
    icon: BarChart3,
    title: 'Sales & analytics',
    desc: 'See revenue, best-selling models and stock movement with live dashboards.',
  },
  {
    icon: Wrench,
    title: 'Service records',
    desc: 'Log service jobs, parts inventory and post-sale support against each vehicle.',
  },
  {
    icon: Ticket,
    title: 'Test rides & coupons',
    desc: 'Schedule test rides and run promotions to convert more walk-ins into buyers.',
  },
  {
    icon: ShieldCheck,
    title: 'Roles & multi-user',
    desc: 'Invite your team with role-based access so everyone sees exactly what they need.',
  },
]

export function Features() {
  return (
    <section id="features" className="scroll-mt-20 border-b border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            Everything in one place
          </p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Run your entire dealership from a single dashboard
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            Voltline replaces spreadsheets and disconnected tools with one platform purpose-built
            for electric vehicle retail.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/40"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <feature.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-base font-semibold text-foreground">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
