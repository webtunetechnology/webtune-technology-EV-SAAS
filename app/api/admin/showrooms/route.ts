import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createApiClient } from '@/lib/supabase/api-client'

// GET: list every showroom with owner, subscription, and rollup counts
export async function GET(request: Request) {
  const { error } = await requireAdmin()
  if (error) return NextResponse.json({ error: error.message }, { status: error.status })

  const supabase = createApiClient()
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')?.trim()

  let query = supabase
    .from('showrooms')
    .select('id, showroom_name, business_type, gst_number, pan_number, owner_id, created_at')
    .order('created_at', { ascending: false })

  if (search) {
    query = query.ilike('showroom_name', `%${search}%`)
  }

  const { data: showrooms, error: qErr } = await query
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 })

  const ownerIds = [...new Set((showrooms || []).map((s) => s.owner_id).filter(Boolean))]
  const showroomIds = (showrooms || []).map((s) => s.id)

  const [ownersRes, subsRes, plansRes] = await Promise.all([
    supabase
      .from('showroom_users')
      .select('id, full_name, email, mobile_number, is_active, last_login_at, created_at')
      .in('id', ownerIds.length ? ownerIds : ['00000000-0000-0000-0000-000000000000']),
    supabase
      .from('showroom_subscriptions')
      .select('showroom_id, plan_id, payment_status, is_trial, subscription_expiry')
      .in('showroom_id', showroomIds.length ? showroomIds : ['00000000-0000-0000-0000-000000000000']),
    supabase.from('subscription_plans').select('id, plan_name, price'),
  ])

  const owners = new Map((ownersRes.data || []).map((o) => [o.id, o]))
  const subs = new Map((subsRes.data || []).map((s) => [s.showroom_id, s]))
  const plans = new Map((plansRes.data || []).map((p) => [p.id, p]))

  // Rollup counts per showroom
  const countBy = async (table: string) => {
    const { data } = await supabase.from(table).select('showroom_id').in('showroom_id', showroomIds.length ? showroomIds : ['00000000-0000-0000-0000-000000000000'])
    const map: Record<string, number> = {}
    for (const row of data || []) map[row.showroom_id] = (map[row.showroom_id] || 0) + 1
    return map
  }

  const [customerCounts, inventoryCounts, invoiceCounts] = await Promise.all([
    countBy('customers'),
    countBy('inventory'),
    countBy('sales_invoices'),
  ])

  const result = (showrooms || []).map((s) => {
    const owner = owners.get(s.owner_id)
    const sub = subs.get(s.id)
    const plan = sub ? plans.get(sub.plan_id) : null
    return {
      ...s,
      owner: owner || null,
      is_active: owner ? owner.is_active : true,
      subscription: sub
        ? { ...sub, plan_name: plan?.plan_name || null, plan_price: plan?.price ?? null }
        : null,
      counts: {
        customers: customerCounts[s.id] || 0,
        inventory: inventoryCounts[s.id] || 0,
        invoices: invoiceCounts[s.id] || 0,
      },
    }
  })

  return NextResponse.json({ success: true, data: result, total: result.length })
}
