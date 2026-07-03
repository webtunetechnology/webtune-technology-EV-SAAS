import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createApiClient } from '@/lib/supabase/api-client'

// GET: all subscription plans with active subscriber counts
export async function GET() {
  const { error } = await requireAdmin()
  if (error) return NextResponse.json({ error: error.message }, { status: error.status })

  const supabase = createApiClient()
  const { data, error: qErr } = await supabase
    .from('subscription_plans')
    .select('*')
    .order('price', { ascending: true })
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 })

  const { data: subs } = await supabase.from('showroom_subscriptions').select('plan_id')
  const counts: Record<string, number> = {}
  for (const s of subs || []) counts[s.plan_id] = (counts[s.plan_id] || 0) + 1

  const result = (data || []).map((p) => ({ ...p, subscriber_count: counts[p.id] || 0 }))
  return NextResponse.json({ success: true, data: result, total: result.length })
}

// POST: create a subscription plan
export async function POST(request: Request) {
  const { error } = await requireAdmin()
  if (error) return NextResponse.json({ error: error.message }, { status: error.status })

  const supabase = createApiClient()
  const body = await request.json()
  if (!body.plan_name?.trim()) {
    return NextResponse.json({ error: 'Plan name is required' }, { status: 400 })
  }

  const features = Array.isArray(body.features)
    ? body.features
    : typeof body.features === 'string'
    ? body.features.split('\n').map((f: string) => f.trim()).filter(Boolean)
    : []

  const insert = {
    plan_name: body.plan_name.trim(),
    description: body.description || null,
    price: body.price ?? 0,
    billing_cycle: body.billing_cycle || 'monthly',
    max_users: body.max_users ?? null,
    max_vehicles: body.max_vehicles ?? null,
    features,
    is_active: body.is_active ?? true,
  }

  const { data, error: iErr } = await supabase.from('subscription_plans').insert(insert).select().single()
  if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 })

  return NextResponse.json({ success: true, data })
}
