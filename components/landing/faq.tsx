const faqs = [
  {
    q: 'Is Voltline built specifically for EV dealers?',
    a: 'Yes. The catalog, inventory and invoicing are designed around electric vehicles — models, variants, battery details and on-road pricing — so it fits EV retail out of the box.',
  },
  {
    q: 'Are the invoices GST compliant?',
    a: 'Absolutely. Voltline generates GST-ready invoices with CGST/SGST, RTO and insurance components calculated automatically for Indian dealerships.',
  },
  {
    q: 'Can my whole team use it?',
    a: 'Yes. Invite sales, service and finance staff with role-based access. User limits depend on your plan, from 2 users on the trial to 100 on Enterprise.',
  },
  {
    q: 'Do I need a credit card to try it?',
    a: 'No. The 14-day free trial requires no credit card. You can explore customer management, inventory and basic invoicing before choosing a paid plan.',
  },
  {
    q: 'Can I manage more than one showroom?',
    a: 'Higher tiers support more vehicles, users and brands. Enterprise adds unlimited brands, custom branding and API access for multi-location operations.',
  },
]

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 border-b border-border bg-background">
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 sm:py-24">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">FAQ</p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Frequently asked questions
          </h2>
        </div>

        <div className="mt-12 divide-y divide-border rounded-2xl border border-border bg-card">
          {faqs.map((faq) => (
            <details key={faq.q} className="group px-6 py-5 [&_summary]:list-none">
              <summary className="flex cursor-pointer items-center justify-between gap-4 text-left text-base font-medium text-foreground">
                {faq.q}
                <span className="shrink-0 text-primary transition-transform group-open:rotate-45">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
