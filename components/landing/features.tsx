import type { LandingContent } from '@/lib/landing-content'
import { getFeatureIcon } from '@/components/landing/icon-map'

export function Features({ content }: { content: LandingContent['features'] }) {
  return (
    <section id="features" className="scroll-mt-20 border-b border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            {content.eyebrow}
          </p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {content.title}
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            {content.subtitle}
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {content.items.map((feature, i) => {
            const Icon = getFeatureIcon(feature.icon)
            return (
              <div
                key={`${feature.title}-${i}`}
                className="rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/40"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-base font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.desc}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
