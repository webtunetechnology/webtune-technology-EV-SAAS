import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createApiClient } from '@/lib/supabase/api-client'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin()
  if (error) return NextResponse.json({ error: error.message }, { status: error.status })

  const { id } = await params
  const supabase = createApiClient()
  const body = await request.json()

  const updates: Record<string, any> = { updated_at: new Date().toISOString() }
  for (const key of ['plan_name', 'description', 'price', 'billing_cycle', 'max_users', 'max_vehicles', 'is_active']) {
    if (key in body) updates[key] = body[key]
  }
  if ('features' in body) {
    updates.features = Array.isArray(body.features)
      ? body.features
      : typeof body.features === 'string'
      ? body.features.split('\n').map((f: string) => f.trim()).filter(Boolean)
      : []
  }

  const { error: uErr } = await supabase.from('subscription_plans').update(updates).eq('id', id)
  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin()
  if (error) return NextResponse.json({ error: error.message }, { status: error.status })

  const { id } = await params
  const supabase = createApiClient()

  const { count } = await supabase
    .from('showroom_subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('plan_id', id)

  if (count && count > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${count} showroom(s) are subscribed to this plan. Deactivate it instead.` },
      { status: 400 }
    )
  }

  const { error: dErr } = await supabase.from('subscription_plans').delete().eq('id', id)
  if (dErr) return NextResponse.json({ error: dErr.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
