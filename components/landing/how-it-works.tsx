const steps = [
  {
    step: '01',
    title: 'Set up your showroom',
    desc: 'Add your branding, GST details and billing configuration, then build your EV catalog and stock.',
  },
  {
    step: '02',
    title: 'Manage customers & rides',
    desc: 'Capture walk-in leads, schedule test rides and store customer KYC and preferences.',
  },
  {
    step: '03',
    title: 'Invoice & track sales',
    desc: 'Generate GST invoices in a click, mark units sold and watch your analytics update live.',
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 border-b border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            How it works
          </p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Live in a day, not a quarter
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            No lengthy onboarding. Sign up, configure your showroom and start selling the same day.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((item) => (
            <div key={item.step} className="relative rounded-xl border border-border bg-card p-6">
              <span className="text-4xl font-semibold text-primary/25">{item.step}</span>
              <h3 className="mt-4 text-lg font-semibold text-foreground">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
