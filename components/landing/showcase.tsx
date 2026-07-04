import Image from 'next/image'
import Link from 'next/link'
import { Check, ArrowRight } from 'lucide-react'

const points = [
  'One catalog and inventory shared across your whole team',
  'Role-based access for sales, service and finance staff',
  'On-road pricing, GST and RTO handled automatically',
  'Live analytics so owners always know what is selling',
]

export function Showcase() {
  return (
    <section className="border-b border-border bg-card">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 sm:py-24 lg:grid-cols-2">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            Built for showrooms
          </p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            From the shop floor to the balance sheet
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            Whether you sell electric scooters or cars, Voltline keeps every unit, customer and
            rupee accounted for — so you can focus on selling, not paperwork.
          </p>

          <ul className="mt-8 space-y-4">
            {points.map((point) => (
              <li key={point} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary/15 text-secondary">
                  <Check className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="text-sm leading-relaxed text-foreground">{point}</span>
              </li>
            ))}
          </ul>

          <Link
            href="/register"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Get started free
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-border">
          <Image
            src="/ev-showroom.png"
            alt="A modern electric vehicle showroom interior with a sleek electric car on display"
            width={1200}
            height={900}
            className="h-full w-full object-cover"
          />
        </div>
      </div>
    </section>
  )
}
