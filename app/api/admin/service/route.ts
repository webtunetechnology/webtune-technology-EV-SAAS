import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createApiClient } from '@/lib/supabase/api-client'

// GET: all service records across the platform
export async function GET(request: Request) {
  const { error } = await requireAdmin()
  if (error) return NextResponse.json({ error: error.message }, { status: error.status })

  const supabase = createApiClient()
  const { searchParams } = new URL(request.url)
  const showroomId = searchParams.get('showroom_id')?.trim()
  const status = searchParams.get('status')?.trim()

  let query = supabase
    .from('service_records')
    .select('id, service_type, status, payment_status, service_date, odometer_reading, labor_cost, parts_cost, tax_amount, discount_amount, customer_rating, customer_id, showroom_id, created_at')
    .order('service_date', { ascending: false })
    .limit(1000)

  if (showroomId) query = query.eq('showroom_id', showroomId)
  if (status) query = query.eq('status', status)

  const { data, error: qErr } = await query
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 })

  const showroomIds = [...new Set((data || []).map((r) => r.showroom_id).filter(Boolean))]
  const customerIds = [...new Set((data || []).map((r) => r.customer_id).filter(Boolean))]

  const [showroomsRes, customersRes] = await Promise.all([
    supabase.from('showrooms').select('id, showroom_name').in('id', showroomIds.length ? showroomIds : ['00000000-0000-0000-0000-000000000000']),
    supabase.from('customers').select('id, first_name, last_name, mobile').in('id', customerIds.length ? customerIds : ['00000000-0000-0000-0000-000000000000']),
  ])

  const showrooms = new Map((showroomsRes.data || []).map((s) => [s.id, s.showroom_name]))
  const customers = new Map((customersRes.data || []).map((c) => [c.id, c]))

  const result = (data || []).map((r) => {
    const cust = customers.get(r.customer_id)
    const total =
      (Number(r.labor_cost) || 0) +
      (Number(r.parts_cost) || 0) +
      (Number(r.tax_amount) || 0) -
      (Number(r.discount_amount) || 0)
    return {
      ...r,
      total_amount: total,
      showroom_name: showrooms.get(r.showroom_id) || null,
      customer_name: cust ? `${cust.first_name || ''} ${cust.last_name || ''}`.trim() : null,
    }
  })

  return NextResponse.json({ success: true, data: result, total: result.length })
}
