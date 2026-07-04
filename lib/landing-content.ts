/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type CtaLink = { label: string; href: string }
export type StatItem = { value: string; label: string }
export type FeatureItem = { icon: string; title: string; desc: string }
export type ShowcaseContent = {
  eyebrow: string
  title: string
  subtitle: string
  points: string[]
  ctaLabel: string
  ctaHref: string
  image: string
}
export type StepItem = { step: string; title: string; desc: string }
export type PlanItem = {
  name: string
  price: string
  period: string
  desc: string
  meta: string
  features: string[]
  cta: string
  highlight: boolean
}
export type FaqItem = { q: string; a: string }

export type LandingContent = {
  brand: { name: string; tagline: string; logo: string }
  hero: {
    badge: string
    titleLead: string
    titleHighlight: string
    subtitle: string
    primaryCta: CtaLink
    secondaryCta: CtaLink
    note: string
  }
  stats: StatItem[]
  features: {
    eyebrow: string
    title: string
    subtitle: string
    items: FeatureItem[]
  }
  showcase: ShowcaseContent
  howItWorks: {
    eyebrow: string
    title: string
    subtitle: string
    steps: StepItem[]
  }
  pricing: {
    eyebrow: string
    title: string
    subtitle: string
    plans: PlanItem[]
  }
  faq: {
    eyebrow: string
    title: string
    items: FaqItem[]
  }
  cta: {
    title: string
    subtitle: string
    primaryCta: CtaLink
    secondaryCta: CtaLink
  }
}

/* ------------------------------------------------------------------ */
/* Icon options (must match keys in landing/icon-map)                  */
/* ------------------------------------------------------------------ */

export const FEATURE_ICON_OPTIONS = [
  'Car',
  'Boxes',
  'Users',
  'FileText',
  'BarChart3',
  'Wrench',
  'Ticket',
  'ShieldCheck',
  'Zap',
  'Gauge',
  'BatteryCharging',
  'IndianRupee',
] as const

/* ------------------------------------------------------------------ */
/* Default content (mirrors the original hard-coded landing copy)      */
/* ------------------------------------------------------------------ */

export const DEFAULT_LANDING_CONTENT: LandingContent = {
  brand: {
    name: 'Voltline',
    tagline: 'The operating system for electric vehicle dealerships in India.',
    logo: '/brand-logo.jpg',
  },
  hero: {
    badge: "Built for India's EV retail boom",
    titleLead: 'The operating system for',
    titleHighlight: 'EV dealerships',
    subtitle:
      'Manage your vehicle catalog, live inventory, customers, GST invoicing, service records and sales analytics — all from one showroom dashboard built for electric vehicles.',
    primaryCta: { label: 'Start 14-day free trial', href: '/register' },
    secondaryCta: { label: 'Sign in to dashboard', href: '/login' },
    note: 'No credit card required · Cancel anytime',
  },
  stats: [
    { value: '5,000+', label: 'Vehicles managed per showroom' },
    { value: 'GST-ready', label: 'Compliant invoices in seconds' },
    { value: '100', label: 'Team members on Enterprise' },
    { value: '14 days', label: 'Free trial, no card needed' },
  ],
  features: {
    eyebrow: 'Everything in one place',
    title: 'Run your entire dealership from a single dashboard',
    subtitle:
      'Voltline replaces spreadsheets and disconnected tools with one platform purpose-built for electric vehicle retail.',
    items: [
      {
        icon: 'Car',
        title: 'Vehicle catalog',
        desc: 'Maintain every model, variant, spec, range and price with a structured EV-first catalog.',
      },
      {
        icon: 'Boxes',
        title: 'Inventory tracking',
        desc: 'Track each unit by VIN, battery health, colour and stock status from arrival to sold.',
      },
      {
        icon: 'Users',
        title: 'Customer CRM',
        desc: 'Capture leads, KYC, addresses and purchase history in one organised customer record.',
      },
      {
        icon: 'FileText',
        title: 'GST invoicing',
        desc: 'Generate compliant on-road invoices with CGST/SGST, RTO and insurance auto-calculated.',
      },
      {
        icon: 'BarChart3',
        title: 'Sales & analytics',
        desc: 'See revenue, best-selling models and stock movement with live dashboards.',
      },
      {
        icon: 'Wrench',
        title: 'Service records',
        desc: 'Log service jobs, parts inventory and post-sale support against each vehicle.',
      },
      {
        icon: 'Ticket',
        title: 'Test rides & coupons',
        desc: 'Schedule test rides and run promotions to convert more walk-ins into buyers.',
      },
      {
        icon: 'ShieldCheck',
        title: 'Roles & multi-user',
        desc: 'Invite your team with role-based access so everyone sees exactly what they need.',
      },
    ],
  },
  showcase: {
    eyebrow: 'Built for showrooms',
    title: 'From the shop floor to the balance sheet',
    subtitle:
      'Whether you sell electric scooters or cars, Voltline keeps every unit, customer and rupee accounted for — so you can focus on selling, not paperwork.',
    points: [
      'One catalog and inventory shared across your whole team',
      'Role-based access for sales, service and finance staff',
      'On-road pricing, GST and RTO handled automatically',
      'Live analytics so owners always know what is selling',
    ],
    ctaLabel: 'Get started free',
    ctaHref: '/register',
    image: '/ev-showroom.png',
  },
  howItWorks: {
    eyebrow: 'How it works',
    title: 'Live in a day, not a quarter',
    subtitle:
      'No lengthy onboarding. Sign up, configure your showroom and start selling the same day.',
    steps: [
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
    ],
  },
  pricing: {
    eyebrow: 'Pricing',
    title: 'Simple, transparent plans',
    subtitle:
      'Start free, upgrade when you grow. Every plan includes GST-ready invoicing and secure cloud storage.',
    plans: [
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
    ],
  },
  faq: {
    eyebrow: 'FAQ',
    title: 'Frequently asked questions',
    items: [
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
    ],
  },
  cta: {
    title: 'Ready to electrify your dealership?',
    subtitle:
      'Join EV showrooms running their catalog, customers and invoicing on Voltline. Start your free trial today.',
    primaryCta: { label: 'Start free trial', href: '/register' },
    secondaryCta: { label: 'Sign in', href: '/login' },
  },
}

/* ------------------------------------------------------------------ */
/* Deep merge: stored (partial) content over defaults                  */
/* ------------------------------------------------------------------ */

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/**
 * Deep-merges a stored partial over the defaults. Arrays from the stored
 * content replace the default arrays entirely (so removals persist), while
 * objects are merged key-by-key so new default keys always appear.
 */
export function mergeLandingContent(stored: unknown): LandingContent {
  const merge = (base: any, override: any): any => {
    if (override === undefined || override === null) return base
    if (Array.isArray(base)) return Array.isArray(override) ? override : base
    if (isPlainObject(base)) {
      if (!isPlainObject(override)) return base
      const out: Record<string, unknown> = { ...base }
      for (const key of Object.keys(base)) {
        out[key] = merge(base[key], (override as Record<string, unknown>)[key])
      }
      return out
    }
    // primitive
    return override
  }
  return merge(DEFAULT_LANDING_CONTENT, stored) as LandingContent
}
