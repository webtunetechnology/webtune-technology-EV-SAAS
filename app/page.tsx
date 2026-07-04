import { SiteHeader } from '@/components/landing/site-header'
import { Hero } from '@/components/landing/hero'
import { Stats } from '@/components/landing/stats'
import { Features } from '@/components/landing/features'
import { Showcase } from '@/components/landing/showcase'
import { HowItWorks } from '@/components/landing/how-it-works'
import { Pricing } from '@/components/landing/pricing'
import { Faq } from '@/components/landing/faq'
import { Cta } from '@/components/landing/cta'
import { SiteFooter } from '@/components/landing/site-footer'
import { getLandingContent } from '@/lib/landing-content.server'

// Always reflect the latest admin-managed content.
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const content = await getLandingContent()

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader brand={content.brand} hero={content.hero} />
      <main>
        <Hero content={content.hero} brand={content.brand} />
        <Stats stats={content.stats} />
        <Features content={content.features} />
        <Showcase content={content.showcase} />
        <HowItWorks content={content.howItWorks} />
        <Pricing content={content.pricing} />
        <Faq content={content.faq} />
        <Cta content={content.cta} />
      </main>
      <SiteFooter brand={content.brand} />
    </div>
  )
}
