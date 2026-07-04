import Link from 'next/link'
import { Check } from 'lucide-react'

const plans = [
  {
    name: 'Free Trial',
    price: '₹0',
    period: 'for 14 days',
    desc: 'Core features to explore the platform.',
    meta: '2 users · 25 vehicles',
    features: ['Customer management', 'Inventory tracking', 'Basic invoicing'],
    cta: 'Start free trial',
    highlight: false,
  },
  {
    name: 'Starter',
    price: '₹1,999',
    period: 'per month',
    desc: 'For small single-location showrooms.',
    meta: '5 users · 100 vehicles',
    features: [
      'Customer management',
      'Inventory tracking',
      'GST invoicing',
      'Service records',
      'Parts inventory',
    ],
    cta: 'Choose Starter',
    highlight: false,
  },
  {
    name: 'Professional',
    price: '₹4,999',
    period: 'per month',
    desc: 'For growing dealerships.',
    meta: '20 users · 500 vehicles',
    features: [
      'Everything in Starter',
      'Multi-user roles',
      'Advanced analytics',
      'Purchase orders',
      'Test ride management',
    ],
    cta: 'Choose Professional',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: '₹9,999',
    period: 'per month',
    desc: 'For multi-brand, high-volume dealers.',
    meta: '100 users · 5,000 vehicles',
    features: [
      'Everything in Professional',
      'Unlimited brands',
      'Priority support',
      'Custom branding',
      'API access',
    ],
    cta: 'Choose Enterprise',
    highlight: false,
  },
]

export function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-20 border-b border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Pricing</p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Simple, transparent plans
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            Start free, upgrade when you grow. Every plan includes GST-ready invoicing and secure
            cloud storage.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-4">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl border bg-background p-6 ${
                plan.highlight
                  ? 'border-primary shadow-xl shadow-primary/10'
                  : 'border-border'
              }`}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  Most popular
                </span>
              )}

              <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{plan.desc}</p>

              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-3xl font-semibold text-foreground">{plan.price}</span>
                <span className="text-sm text-muted-foreground">/ {plan.period}</span>
              </div>
              <p className="mt-2 text-xs font-medium text-secondary">{plan.meta}</p>

              <Link
                href="/register"
                className={`mt-6 inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${
                  plan.highlight
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'border border-border bg-card text-foreground hover:bg-muted'
                }`}
              >
                {plan.cta}
              </Link>

              <ul className="mt-6 space-y-3 border-t border-border pt-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
                    <span className="text-sm leading-relaxed text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
