import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createApiClient } from '@/lib/supabase/api-client'

// GET: all sales invoices across the platform
export async function GET(request: Request) {
  const { error } = await requireAdmin()
  if (error) return NextResponse.json({ error: error.message }, { status: error.status })

  const supabase = createApiClient()
  const { searchParams } = new URL(request.url)
  const showroomId = searchParams.get('showroom_id')?.trim()
  const search = searchParams.get('search')?.trim()

  let query = supabase
    .from('sales_invoices')
    .select('id, invoice_number, sale_date, ex_showroom_price, cgst_amount, sgst_amount, accessories_amount, payment_status, is_cancelled, customer_id, showroom_id, created_at')
    .order('sale_date', { ascending: false })
    .limit(1000)

  if (showroomId) query = query.eq('showroom_id', showroomId)
  if (search) query = query.ilike('invoice_number', `%${search}%`)

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
    const total =
      (Number(r.ex_showroom_price) || 0) +
      (Number(r.cgst_amount) || 0) +
      (Number(r.sgst_amount) || 0) +
      (Number(r.accessories_amount) || 0)
    const cust = customers.get(r.customer_id)
    return {
      ...r,
      total_amount: total,
      showroom_name: showrooms.get(r.showroom_id) || null,
      customer_name: cust ? `${cust.first_name || ''} ${cust.last_name || ''}`.trim() : null,
      customer_mobile: cust?.mobile || null,
    }
  })

  return NextResponse.json({ success: true, data: result, total: result.length })
}
