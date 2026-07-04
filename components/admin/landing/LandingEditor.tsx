'use client'

import useSWR from 'swr'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LayoutTemplate, ExternalLink, Save, RotateCcw, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { LoadingState, ErrorState } from '@/components/admin/AdminUI'
import { fetcher, adminMutate } from '@/lib/admin-client'
import {
  DEFAULT_LANDING_CONTENT,
  FEATURE_ICON_OPTIONS,
  type LandingContent,
} from '@/lib/landing-content'
import { TextField, AreaField, ItemRow, AddButton, moveItem } from '@/components/admin/landing/fields'

export function LandingEditor() {
  const { data, error, isLoading, mutate } = useSWR<{ data: LandingContent }>(
    '/api/admin/landing-content',
    fetcher
  )
  const [content, setContent] = useState<LandingContent | null>(null)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    if (data?.data) setContent(data.data)
  }, [data])

  // Immutable update helper.
  const set = (updater: (draft: LandingContent) => void) => {
    setSaved(false)
    setContent((prev) => {
      if (!prev) return prev
      const next = structuredClone(prev)
      updater(next)
      return next
    })
  }

  const save = async () => {
    if (!content) return
    setBusy(true)
    setSaveError('')
    try {
      await adminMutate('/api/admin/landing-content', 'PUT', content)
      await mutate()
      setSaved(true)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setBusy(false)
    }
  }

  const resetDefaults = () => {
    if (confirm('Reset all landing page content back to the built-in defaults? Unsaved edits will be lost.')) {
      setContent(structuredClone(DEFAULT_LANDING_CONTENT))
      setSaved(false)
    }
  }

  if (isLoading) return <LoadingState label="Loading landing content..." />
  if (error) return <ErrorState />
  if (!content) return <LoadingState label="Preparing editor..." />

  return (
    <div className="flex flex-col gap-6 pb-24">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <LayoutTemplate className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Landing Page</h2>
            <p className="text-sm text-muted-foreground">
              Edit everything shown on your public homepage.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/" target="_blank">
              <ExternalLink className="mr-1.5 h-4 w-4" />
              View live site
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={resetDefaults}>
            <RotateCcw className="mr-1.5 h-4 w-4" />
            Reset
          </Button>
          <Button size="sm" onClick={save} disabled={busy}>
            {saved ? <Check className="mr-1.5 h-4 w-4" /> : <Save className="mr-1.5 h-4 w-4" />}
            {busy ? 'Saving...' : saved ? 'Saved' : 'Save changes'}
          </Button>
        </div>
      </div>

      {saveError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{saveError}</p>
      )}

      <Card className="p-2 sm:p-4">
        <Accordion type="multiple" defaultValue={['brand', 'hero']} className="w-full">
          {/* BRAND */}
          <Section value="brand" title="Brand">
            <TextField label="Brand name" value={content.brand.name} onChange={(v) => set((d) => { d.brand.name = v })} />
            <TextField label="Footer tagline" value={content.brand.tagline} onChange={(v) => set((d) => { d.brand.tagline = v })} />
            <TextField label="Logo image URL" value={content.brand.logo} onChange={(v) => set((d) => { d.brand.logo = v })} placeholder="/brand-logo.jpg" />
          </Section>

          {/* HERO */}
          <Section value="hero" title="Hero">
            <TextField label="Badge text" value={content.hero.badge} onChange={(v) => set((d) => { d.hero.badge = v })} />
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label="Title (line lead)" value={content.hero.titleLead} onChange={(v) => set((d) => { d.hero.titleLead = v })} />
              <TextField label="Title (highlighted)" value={content.hero.titleHighlight} onChange={(v) => set((d) => { d.hero.titleHighlight = v })} />
            </div>
            <AreaField label="Subtitle" value={content.hero.subtitle} onChange={(v) => set((d) => { d.hero.subtitle = v })} />
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label="Primary button label" value={content.hero.primaryCta.label} onChange={(v) => set((d) => { d.hero.primaryCta.label = v })} />
              <TextField label="Primary button link" value={content.hero.primaryCta.href} onChange={(v) => set((d) => { d.hero.primaryCta.href = v })} />
              <TextField label="Secondary button label" value={content.hero.secondaryCta.label} onChange={(v) => set((d) => { d.hero.secondaryCta.label = v })} />
              <TextField label="Secondary button link" value={content.hero.secondaryCta.href} onChange={(v) => set((d) => { d.hero.secondaryCta.href = v })} />
            </div>
            <TextField label="Reassurance note" value={content.hero.note} onChange={(v) => set((d) => { d.hero.note = v })} />
          </Section>

          {/* STATS */}
          <Section value="stats" title={`Stats bar (${content.stats.length})`}>
            {content.stats.map((s, i) => (
              <ItemRow
                key={i}
                title={`Stat ${i + 1}`}
                index={i}
                count={content.stats.length}
                onMove={(from, to) => set((d) => { d.stats = moveItem(d.stats, from, to) })}
                onRemove={(idx) => set((d) => { d.stats.splice(idx, 1) })}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField label="Value" value={s.value} onChange={(v) => set((d) => { d.stats[i].value = v })} />
                  <TextField label="Label" value={s.label} onChange={(v) => set((d) => { d.stats[i].label = v })} />
                </div>
              </ItemRow>
            ))}
            <AddButton label="Add stat" onClick={() => set((d) => { d.stats.push({ value: '', label: '' }) })} />
          </Section>

          {/* FEATURES */}
          <Section value="features" title={`Features (${content.features.items.length})`}>
            <TextField label="Eyebrow" value={content.features.eyebrow} onChange={(v) => set((d) => { d.features.eyebrow = v })} />
            <TextField label="Heading" value={content.features.title} onChange={(v) => set((d) => { d.features.title = v })} />
            <AreaField label="Subtitle" value={content.features.subtitle} onChange={(v) => set((d) => { d.features.subtitle = v })} />
            {content.features.items.map((f, i) => (
              <ItemRow
                key={i}
                title={`Feature ${i + 1}`}
                index={i}
                count={content.features.items.length}
                onMove={(from, to) => set((d) => { d.features.items = moveItem(d.features.items, from, to) })}
                onRemove={(idx) => set((d) => { d.features.items.splice(idx, 1) })}
              >
                <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
                  <IconSelect value={f.icon} onChange={(v) => set((d) => { d.features.items[i].icon = v })} />
                  <TextField label="Title" value={f.title} onChange={(v) => set((d) => { d.features.items[i].title = v })} />
                </div>
                <AreaField label="Description" rows={2} value={f.desc} onChange={(v) => set((d) => { d.features.items[i].desc = v })} />
              </ItemRow>
            ))}
            <AddButton label="Add feature" onClick={() => set((d) => { d.features.items.push({ icon: 'Zap', title: '', desc: '' }) })} />
          </Section>

          {/* SHOWCASE */}
          <Section value="showcase" title="Showcase">
            <TextField label="Eyebrow" value={content.showcase.eyebrow} onChange={(v) => set((d) => { d.showcase.eyebrow = v })} />
            <TextField label="Heading" value={content.showcase.title} onChange={(v) => set((d) => { d.showcase.title = v })} />
            <AreaField label="Subtitle" value={content.showcase.subtitle} onChange={(v) => set((d) => { d.showcase.subtitle = v })} />
            <TextField label="Image path" value={content.showcase.image} onChange={(v) => set((d) => { d.showcase.image = v })} placeholder="/ev-showroom.png" />
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label="Button label" value={content.showcase.ctaLabel} onChange={(v) => set((d) => { d.showcase.ctaLabel = v })} />
              <TextField label="Button link" value={content.showcase.ctaHref} onChange={(v) => set((d) => { d.showcase.ctaHref = v })} />
            </div>
            <Label className="mt-1 text-xs font-medium text-muted-foreground">Checklist points</Label>
            {content.showcase.points.map((p, i) => (
              <ItemRow
                key={i}
                title={`Point ${i + 1}`}
                index={i}
                count={content.showcase.points.length}
                onMove={(from, to) => set((d) => { d.showcase.points = moveItem(d.showcase.points, from, to) })}
                onRemove={(idx) => set((d) => { d.showcase.points.splice(idx, 1) })}
              >
                <TextField label="Text" value={p} onChange={(v) => set((d) => { d.showcase.points[i] = v })} />
              </ItemRow>
            ))}
            <AddButton label="Add point" onClick={() => set((d) => { d.showcase.points.push('') })} />
          </Section>

          {/* HOW IT WORKS */}
          <Section value="how" title={`How it works (${content.howItWorks.steps.length})`}>
            <TextField label="Eyebrow" value={content.howItWorks.eyebrow} onChange={(v) => set((d) => { d.howItWorks.eyebrow = v })} />
            <TextField label="Heading" value={content.howItWorks.title} onChange={(v) => set((d) => { d.howItWorks.title = v })} />
            <AreaField label="Subtitle" value={content.howItWorks.subtitle} onChange={(v) => set((d) => { d.howItWorks.subtitle = v })} />
            {content.howItWorks.steps.map((s, i) => (
              <ItemRow
                key={i}
                title={`Step ${i + 1}`}
                index={i}
                count={content.howItWorks.steps.length}
                onMove={(from, to) => set((d) => { d.howItWorks.steps = moveItem(d.howItWorks.steps, from, to) })}
                onRemove={(idx) => set((d) => { d.howItWorks.steps.splice(idx, 1) })}
              >
                <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
                  <TextField label="Step no." value={s.step} onChange={(v) => set((d) => { d.howItWorks.steps[i].step = v })} />
                  <TextField label="Title" value={s.title} onChange={(v) => set((d) => { d.howItWorks.steps[i].title = v })} />
                </div>
                <AreaField label="Description" rows={2} value={s.desc} onChange={(v) => set((d) => { d.howItWorks.steps[i].desc = v })} />
              </ItemRow>
            ))}
            <AddButton label="Add step" onClick={() => set((d) => { d.howItWorks.steps.push({ step: '', title: '', desc: '' }) })} />
          </Section>

          {/* PRICING */}
          <Section value="pricing" title={`Pricing (${content.pricing.plans.length} plans)`}>
            <TextField label="Eyebrow" value={content.pricing.eyebrow} onChange={(v) => set((d) => { d.pricing.eyebrow = v })} />
            <TextField label="Heading" value={content.pricing.title} onChange={(v) => set((d) => { d.pricing.title = v })} />
            <AreaField label="Subtitle" value={content.pricing.subtitle} onChange={(v) => set((d) => { d.pricing.subtitle = v })} />
            {content.pricing.plans.map((p, i) => (
              <ItemRow
                key={i}
                title={p.name || `Plan ${i + 1}`}
                index={i}
                count={content.pricing.plans.length}
                onMove={(from, to) => set((d) => { d.pricing.plans = moveItem(d.pricing.plans, from, to) })}
                onRemove={(idx) => set((d) => { d.pricing.plans.splice(idx, 1) })}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField label="Plan name" value={p.name} onChange={(v) => set((d) => { d.pricing.plans[i].name = v })} />
                  <TextField label="Sub-label (meta)" value={p.meta} onChange={(v) => set((d) => { d.pricing.plans[i].meta = v })} />
                  <TextField label="Price" value={p.price} onChange={(v) => set((d) => { d.pricing.plans[i].price = v })} />
                  <TextField label="Period" value={p.period} onChange={(v) => set((d) => { d.pricing.plans[i].period = v })} />
                </div>
                <TextField label="Description" value={p.desc} onChange={(v) => set((d) => { d.pricing.plans[i].desc = v })} />
                <TextField label="Button label" value={p.cta} onChange={(v) => set((d) => { d.pricing.plans[i].cta = v })} />
                <AreaField
                  label="Features (one per line)"
                  rows={5}
                  value={p.features.join('\n')}
                  onChange={(v) => set((d) => { d.pricing.plans[i].features = v.split('\n').map((f) => f).filter((f) => f.trim() !== '') })}
                />
                <div className="flex items-center gap-2">
                  <Switch
                    checked={p.highlight}
                    onCheckedChange={(c) => set((d) => { d.pricing.plans.forEach((pl, idx) => { pl.highlight = idx === i ? c : false }) })}
                    id={`hl-${i}`}
                  />
                  <Label htmlFor={`hl-${i}`} className="text-sm text-foreground">Mark as &quot;Most popular&quot;</Label>
                </div>
              </ItemRow>
            ))}
            <AddButton
              label="Add plan"
              onClick={() => set((d) => { d.pricing.plans.push({ name: '', price: '', period: 'per month', desc: '', meta: '', features: [], cta: 'Choose plan', highlight: false }) })}
            />
          </Section>

          {/* FAQ */}
          <Section value="faq" title={`FAQ (${content.faq.items.length})`}>
            <TextField label="Eyebrow" value={content.faq.eyebrow} onChange={(v) => set((d) => { d.faq.eyebrow = v })} />
            <TextField label="Heading" value={content.faq.title} onChange={(v) => set((d) => { d.faq.title = v })} />
            {content.faq.items.map((f, i) => (
              <ItemRow
                key={i}
                title={`Q${i + 1}`}
                index={i}
                count={content.faq.items.length}
                onMove={(from, to) => set((d) => { d.faq.items = moveItem(d.faq.items, from, to) })}
                onRemove={(idx) => set((d) => { d.faq.items.splice(idx, 1) })}
              >
                <TextField label="Question" value={f.q} onChange={(v) => set((d) => { d.faq.items[i].q = v })} />
                <AreaField label="Answer" rows={3} value={f.a} onChange={(v) => set((d) => { d.faq.items[i].a = v })} />
              </ItemRow>
            ))}
            <AddButton label="Add question" onClick={() => set((d) => { d.faq.items.push({ q: '', a: '' }) })} />
          </Section>

          {/* CTA */}
          <Section value="cta" title="Closing CTA">
            <TextField label="Heading" value={content.cta.title} onChange={(v) => set((d) => { d.cta.title = v })} />
            <AreaField label="Subtitle" value={content.cta.subtitle} onChange={(v) => set((d) => { d.cta.subtitle = v })} />
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label="Primary button label" value={content.cta.primaryCta.label} onChange={(v) => set((d) => { d.cta.primaryCta.label = v })} />
              <TextField label="Primary button link" value={content.cta.primaryCta.href} onChange={(v) => set((d) => { d.cta.primaryCta.href = v })} />
              <TextField label="Secondary button label" value={content.cta.secondaryCta.label} onChange={(v) => set((d) => { d.cta.secondaryCta.label = v })} />
              <TextField label="Secondary button link" value={content.cta.secondaryCta.href} onChange={(v) => set((d) => { d.cta.secondaryCta.href = v })} />
            </div>
          </Section>
        </Accordion>
      </Card>

      {/* Sticky save bar for long scroll */}
      <div className="sticky bottom-4 z-10 flex justify-end">
        <Button onClick={save} disabled={busy} className="shadow-lg">
          {saved ? <Check className="mr-1.5 h-4 w-4" /> : <Save className="mr-1.5 h-4 w-4" />}
          {busy ? 'Saving...' : saved ? 'Saved' : 'Save changes'}
        </Button>
      </div>
    </div>
  )
}

function Section({
  value,
  title,
  children,
}: {
  value: string
  title: string
  children: React.ReactNode
}) {
  return (
    <AccordionItem value={value}>
      <AccordionTrigger className="px-2 text-sm font-semibold">{title}</AccordionTrigger>
      <AccordionContent className="px-2">
        <div className="flex flex-col gap-4 pb-2">{children}</div>
      </AccordionContent>
    </AccordionItem>
  )
}

function IconSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs font-medium text-muted-foreground">Icon</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Icon" />
        </SelectTrigger>
        <SelectContent>
          {FEATURE_ICON_OPTIONS.map((name) => (
            <SelectItem key={name} value={name}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
