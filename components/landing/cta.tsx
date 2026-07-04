import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { LandingContent } from '@/lib/landing-content'

export function Cta({ content }: { content: LandingContent['cta'] }) {
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="overflow-hidden rounded-3xl bg-primary px-6 py-14 text-center sm:px-12">
          <h2 className="mx-auto max-w-2xl text-balance text-3xl font-semibold tracking-tight text-primary-foreground sm:text-4xl">
            {content.title}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-lg leading-relaxed text-primary-foreground/80">
            {content.subtitle}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={content.primaryCta.href}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-background px-6 py-3 text-sm font-semibold text-foreground transition-opacity hover:opacity-90 sm:w-auto"
            >
              {content.primaryCta.label}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href={content.secondaryCta.href}
              className="inline-flex w-full items-center justify-center rounded-full border border-primary-foreground/30 px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-foreground/10 sm:w-auto"
            >
              {content.secondaryCta.label}
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
