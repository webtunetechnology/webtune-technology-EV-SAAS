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
  for (const key of [
    'brand_id', 'model_name', 'variant_name', 'vehicle_type', 'ex_showroom_price',
    'battery_capacity_kwh', 'range_per_charge_km', 'motor_power_kw', 'top_speed_kmph',
    'seating_capacity', 'is_active', 'is_discontinued',
  ]) {
    if (key in body) updates[key] = body[key]
  }

  const { error: uErr } = await supabase.from('vehicles').update(updates).eq('id', id)
  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin()
  if (error) return NextResponse.json({ error: error.message }, { status: error.status })

  const { id } = await params
  const supabase = createApiClient()

  // Prevent deleting a model that is referenced by inventory
  const { count } = await supabase
    .from('inventory')
    .select('*', { count: 'exact', head: true })
    .eq('vehicle_model_id', id)

  if (count && count > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${count} inventory unit(s) reference this model. Mark it discontinued instead.` },
      { status: 400 }
    )
  }

  const { error: dErr } = await supabase.from('vehicles').delete().eq('id', id)
  if (dErr) return NextResponse.json({ error: dErr.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
