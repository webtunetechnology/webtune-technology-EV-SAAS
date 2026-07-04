import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createApiClient } from '@/lib/supabase/api-client'

// GET: all inventory units across the platform
export async function GET(request: Request) {
  const { error } = await requireAdmin()
  if (error) return NextResponse.json({ error: error.message }, { status: error.status })

  const supabase = createApiClient()
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')?.trim()
  const showroomId = searchParams.get('showroom_id')?.trim()
  const search = searchParams.get('search')?.trim()

  let query = supabase
    .from('inventory')
    .select('id, chassis_number, vin_number, motor_number, battery_number, variant_name, color, stock_status, purchase_cost, ex_showroom_price, current_selling_price, on_road_price, received_date, sold_date, showroom_id, vehicle_model_id')
    .order('created_at', { ascending: false })
    .limit(1000)

  if (status) query = query.eq('stock_status', status)
  if (showroomId) query = query.eq('showroom_id', showroomId)
  if (search) query = query.or(`chassis_number.ilike.%${search}%,vin_number.ilike.%${search}%,variant_name.ilike.%${search}%`)

  const { data, error: qErr } = await query
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 })

  const showroomIds = [...new Set((data || []).map((r) => r.showroom_id).filter(Boolean))]
  const modelIds = [...new Set((data || []).map((r) => r.vehicle_model_id).filter(Boolean))]

  const [showroomsRes, modelsRes] = await Promise.all([
    supabase.from('showrooms').select('id, showroom_name').in('id', showroomIds.length ? showroomIds : ['00000000-0000-0000-0000-000000000000']),
    supabase.from('vehicles').select('id, model_name, variant_name, brand_id').in('id', modelIds.length ? modelIds : ['00000000-0000-0000-0000-000000000000']),
  ])

  const showrooms = new Map((showroomsRes.data || []).map((s) => [s.id, s.showroom_name]))
  const models = new Map((modelsRes.data || []).map((m) => [m.id, m]))

  const result = (data || []).map((r) => ({
    ...r,
    showroom_name: showrooms.get(r.showroom_id) || null,
    model: models.get(r.vehicle_model_id) || null,
  }))

  return NextResponse.json({ success: true, data: result, total: result.length })
}
