import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createApiClient } from '@/lib/supabase/api-client'

// GET: master vehicle catalog with brand names
export async function GET(request: Request) {
  const { error } = await requireAdmin()
  if (error) return NextResponse.json({ error: error.message }, { status: error.status })

  const supabase = createApiClient()
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')?.trim()

  let query = supabase
    .from('vehicles')
    .select('*')
    .order('created_at', { ascending: false })

  if (search) query = query.or(`model_name.ilike.%${search}%,variant_name.ilike.%${search}%`)

  const { data, error: qErr } = await query
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 })

  const { data: brands } = await supabase.from('brands').select('id, brand_name')
  const brandMap = new Map((brands || []).map((b) => [b.id, b.brand_name]))

  const result = (data || []).map((v) => ({ ...v, brand_name: brandMap.get(v.brand_id) || null }))
  return NextResponse.json({ success: true, data: result, total: result.length })
}

// POST: add a vehicle model to the master catalog
export async function POST(request: Request) {
  const { error } = await requireAdmin()
  if (error) return NextResponse.json({ error: error.message }, { status: error.status })

  const supabase = createApiClient()
  const body = await request.json()

  if (!body.model_name || !body.brand_id) {
    return NextResponse.json({ error: 'Brand and model name are required' }, { status: 400 })
  }

  const insert = {
    brand_id: body.brand_id,
    model_name: body.model_name,
    variant_name: body.variant_name || null,
    vehicle_type: body.vehicle_type || null,
    ex_showroom_price: body.ex_showroom_price ?? null,
    battery_capacity_kwh: body.battery_capacity_kwh ?? null,
    range_per_charge_km: body.range_per_charge_km ?? null,
    motor_power_kw: body.motor_power_kw ?? null,
    top_speed_kmph: body.top_speed_kmph ?? null,
    seating_capacity: body.seating_capacity ?? null,
    is_active: body.is_active ?? true,
  }

  const { data, error: iErr } = await supabase.from('vehicles').insert(insert).select().single()
  if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 })

  return NextResponse.json({ success: true, data })
}
