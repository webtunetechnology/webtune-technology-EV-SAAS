import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api-client'
import { resolveAccess, TRIAL_DAYS } from '@/lib/subscription'

function getShowroomId(request: NextRequest): string | null {
  return request.cookies.get('showroom_id')?.value || null
}

// GET: current subscription + computed access + available plans for the logged-in vendor
export async function GET(request: NextRequest) {
  const showroomId = getShowroomId(request)
  if (!showroomId) {
    return NextResponse.json({ error: 'Unauthorized - No showroom found' }, { status: 401 })
  }

  const supabase = createApiClient()

  const [subRes, plansRes] = await Promise.all([
    supabase.from('showroom_subscriptions').select('*').eq('showroom_id', showroomId).maybeSingle(),
    supabase.from('subscription_plans').select('*').eq('is_active', true).order('price', { ascending: true }),
  ])

  let subscription = subRes.data

  // Self-heal: if a showroom somehow has no subscription row, start a trial now.
  if (!subscription) {
    const now = new Date()
    const expiry = new Date(now)
    expiry.setDate(expiry.getDate() + TRIAL_DAYS)
    const { data: created } = await supabase
      .from('showroom_subscriptions')
      .insert({
        showroom_id: showroomId,
        payment_status: 'trial',
        is_trial: true,
        amount: 0,
        subscription_start: now.toISOString(),
        subscription_expiry: expiry.toISOString(),
      })
      .select('*')
      .maybeSingle()
    subscription = created
  }

  // Attach plan details to the subscription if present
  let plan = null
  if (subscription?.plan_id) {
    plan = (plansRes.data || []).find((p) => p.id === subscription.plan_id) || null
    if (!plan) {
      const { data } = await supabase.from('subscription_plans').select('*').eq('id', subscription.plan_id).maybeSingle()
      plan = data || null
    }
  }

  const access = resolveAccess(subscription)

  return NextResponse.json({
    success: true,
    subscription: subscription ? { ...subscription, plan } : null,
    access,
    plans: plansRes.data || [],
  })
}
