import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createApiClient } from '@/lib/supabase/api-client'
import { addDays, cycleDays, resolveAccess, TRIAL_DAYS } from '@/lib/subscription'

// PATCH: admin manually manages a showroom's subscription.
// Supported body actions (any combination):
//   { plan_id, billing_cycle }          -> assign plan
//   { action: 'activate' }              -> mark active for a full billing cycle from now
//   { action: 'start_trial' }           -> reset a trial for TRIAL_DAYS
//   { action: 'expire' }                -> mark expired immediately
//   { action: 'cancel' }                -> cancel subscription
//   { extend_days: number }             -> extend expiry by N days
//   { subscription_expiry: ISOString }  -> set explicit expiry
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin()
  if (error) return NextResponse.json({ error: error.message }, { status: error.status })

  const { id: showroomId } = await params
  const supabase = createApiClient()
  const body = await request.json().catch(() => ({}))

  // Load existing subscription (or prepare to create one).
  const { data: existing } = await supabase
    .from('showroom_subscriptions')
    .select('*')
    .eq('showroom_id', showroomId)
    .maybeSingle()

  const now = new Date()
  const update: Record<string, any> = { showroom_id: showroomId, updated_at: now.toISOString() }

  if ('plan_id' in body) update.plan_id = body.plan_id || null
  if ('billing_cycle' in body) update.billing_cycle = body.billing_cycle || null
  if ('amount' in body) update.amount = body.amount

  const cycle = body.billing_cycle || existing?.billing_cycle || 'monthly'

  switch (body.action) {
    case 'activate':
      update.payment_status = 'active'
      update.is_trial = false
      update.subscription_start = now.toISOString()
      update.subscription_expiry = addDays(now, cycleDays(cycle))
      break
    case 'start_trial':
      update.payment_status = 'trial'
      update.is_trial = true
      update.subscription_start = now.toISOString()
      update.subscription_expiry = addDays(now, TRIAL_DAYS)
      break
    case 'expire':
      update.payment_status = 'expired'
      update.subscription_expiry = now.toISOString()
      break
    case 'cancel':
      update.payment_status = 'cancelled'
      update.cancelled_at = now.toISOString()
      break
  }

  if (typeof body.extend_days === 'number' && body.extend_days !== 0) {
    const base =
      existing?.subscription_expiry && new Date(existing.subscription_expiry) > now
        ? new Date(existing.subscription_expiry)
        : now
    update.subscription_expiry = addDays(base, body.extend_days)
    // Extending a lapsed subscription reactivates it.
    if (!body.action) {
      update.payment_status = existing?.is_trial ? 'trial' : 'active'
    }
  }

  if (typeof body.subscription_expiry === 'string') {
    update.subscription_expiry = body.subscription_expiry
  }
  if (typeof body.payment_status === 'string') {
    update.payment_status = body.payment_status
  }
  if (typeof body.is_trial === 'boolean') {
    update.is_trial = body.is_trial
  }

  let result
  if (existing) {
    const { data, error: uErr } = await supabase
      .from('showroom_subscriptions')
      .update(update)
      .eq('showroom_id', showroomId)
      .select('*')
      .single()
    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 })
    result = data
  } else {
    if (!update.payment_status) update.payment_status = 'pending'
    const { data, error: iErr } = await supabase
      .from('showroom_subscriptions')
      .insert({ created_at: now.toISOString(), ...update })
      .select('*')
      .single()
    if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 })
    result = data
  }

  return NextResponse.json({ success: true, subscription: result, access: resolveAccess(result) })
}
