// Central subscription logic: trial length, billing periods, and access rules.
// Used by both vendor-facing and admin-facing subscription flows.

export const TRIAL_DAYS = 14

export type SubscriptionRecord = {
  id: string
  showroom_id: string
  plan_id: string | null
  billing_cycle: string | null
  payment_status: string | null
  subscription_start: string | null
  subscription_expiry: string | null
  is_trial: boolean
  amount?: number | null
  razorpay_order_id?: string | null
  razorpay_payment_id?: string | null
  created_at?: string
  updated_at?: string
}

export type SubscriptionAccess = {
  hasAccess: boolean
  status: 'trial' | 'active' | 'expired' | 'pending' | 'cancelled' | 'none'
  isTrial: boolean
  daysLeft: number
  expiresAt: string | null
}

/**
 * Number of days a billing cycle lasts.
 */
export function cycleDays(billingCycle: string | null | undefined): number {
  switch ((billingCycle || 'monthly').toLowerCase()) {
    case 'yearly':
    case 'annual':
    case 'annually':
      return 365
    case 'quarterly':
      return 90
    case 'weekly':
      return 7
    case 'monthly':
    default:
      return 30
  }
}

/**
 * Add N days to a base date and return an ISO string.
 */
export function addDays(base: Date, days: number): string {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

/**
 * Resolve whether a subscription currently grants dashboard access.
 * Access is granted while a trial or paid subscription is active and not expired.
 */
export function resolveAccess(sub: SubscriptionRecord | null | undefined): SubscriptionAccess {
  if (!sub) {
    return { hasAccess: false, status: 'none', isTrial: false, daysLeft: 0, expiresAt: null }
  }

  const now = Date.now()
  const expiry = sub.subscription_expiry ? new Date(sub.subscription_expiry).getTime() : null
  const notExpired = expiry === null || expiry > now
  const daysLeft = expiry === null ? Infinity : Math.max(0, Math.ceil((expiry - now) / (1000 * 60 * 60 * 24)))

  const rawStatus = (sub.payment_status || '').toLowerCase()

  // Cancelled subscriptions never grant access.
  if (rawStatus === 'cancelled') {
    return { hasAccess: false, status: 'cancelled', isTrial: sub.is_trial, daysLeft: 0, expiresAt: sub.subscription_expiry }
  }

  // Trial access.
  if (sub.is_trial || rawStatus === 'trial') {
    return {
      hasAccess: notExpired,
      status: notExpired ? 'trial' : 'expired',
      isTrial: true,
      daysLeft: daysLeft === Infinity ? 0 : daysLeft,
      expiresAt: sub.subscription_expiry,
    }
  }

  // Paid/active access.
  if (rawStatus === 'active' || rawStatus === 'paid') {
    return {
      hasAccess: notExpired,
      status: notExpired ? 'active' : 'expired',
      isTrial: false,
      daysLeft: daysLeft === Infinity ? 0 : daysLeft,
      expiresAt: sub.subscription_expiry,
    }
  }

  // Pending payment (chose a plan but not paid yet) — no access unless still within trial expiry.
  return {
    hasAccess: false,
    status: rawStatus === 'expired' ? 'expired' : 'pending',
    isTrial: false,
    daysLeft: 0,
    expiresAt: sub.subscription_expiry,
  }
}
