import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createApiClient } from '@/lib/supabase/api-client'

// GET: full detail for one showroom
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin()
  if (error) return NextResponse.json({ error: error.message }, { status: error.status })

  const { id } = await params
  const supabase = createApiClient()

  const { data: showroom, error: sErr } = await supabase
    .from('showrooms')
    .select('*')
    .eq('id', id)
    .single()

  if (sErr || !showroom) return NextResponse.json({ error: 'Showroom not found' }, { status: 404 })

  const [owner, branding, addresses, billing, subscription] = await Promise.all([
    supabase.from('showroom_users').select('id, full_name, email, mobile_number, is_active, role, last_login_at, created_at').eq('id', showroom.owner_id).maybeSingle(),
    supabase.from('showroom_branding').select('*').eq('showroom_id', id).maybeSingle(),
    supabase.from('showroom_addresses').select('*').eq('showroom_id', id),
    supabase.from('billing_configurations').select('*').eq('showroom_id', id).maybeSingle(),
    supabase.from('showroom_subscriptions').select('*').eq('showroom_id', id).maybeSingle(),
  ])

  return NextResponse.json({
    success: true,
    data: {
      ...showroom,
      owner: owner.data || null,
      branding: branding.data || null,
      addresses: addresses.data || [],
      billing_configuration: billing.data || null,
      subscription: subscription.data || null,
    },
  })
}

// PATCH: update showroom fields and/or suspend/activate its owner account
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin()
  if (error) return NextResponse.json({ error: error.message }, { status: error.status })

  const { id } = await params
  const supabase = createApiClient()
  const body = await request.json()

  const showroomFields: Record<string, any> = {}
  for (const key of ['showroom_name', 'business_type', 'gst_number', 'pan_number', 'business_registration_type']) {
    if (key in body) showroomFields[key] = body[key]
  }

  if (Object.keys(showroomFields).length > 0) {
    showroomFields.updated_at = new Date().toISOString()
    const { error: uErr } = await supabase.from('showrooms').update(showroomFields).eq('id', id)
    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 })
  }

  // Suspend/activate the owner account
  if (typeof body.is_active === 'boolean') {
    const { data: showroom } = await supabase.from('showrooms').select('owner_id').eq('id', id).single()
    if (showroom?.owner_id) {
      await supabase
        .from('showroom_users')
        .update({ is_active: body.is_active, updated_at: new Date().toISOString() })
        .eq('id', showroom.owner_id)
    }
  }

  return NextResponse.json({ success: true })
}

// DELETE: remove a showroom and all of its data
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin()
  if (error) return NextResponse.json({ error: error.message }, { status: error.status })

  const { id } = await params
  const supabase = createApiClient()

  const { data: showroom } = await supabase.from('showrooms').select('owner_id').eq('id', id).single()

  // First delete grandchild item tables (they have no showroom_id) via their parents.
  const { data: counterSales } = await supabase.from('parts_counter_sales').select('id').eq('showroom_id', id)
  const counterSaleIds = (counterSales || []).map((r) => r.id)
  if (counterSaleIds.length) {
    await supabase.from('parts_counter_sale_items').delete().in('counter_sale_id', counterSaleIds)
  }

  const { data: purchaseOrders } = await supabase.from('parts_purchase_orders').select('id').eq('showroom_id', id)
  const purchaseOrderIds = (purchaseOrders || []).map((r) => r.id)
  if (purchaseOrderIds.length) {
    await supabase.from('parts_purchase_order_items').delete().in('purchase_order_id', purchaseOrderIds)
  }

  // Delete remaining child records scoped directly to the showroom, then the showroom, then the owner.
  const scopedTables = [
    'parts_counter_sales',
    'parts_purchase_orders',
    'parts_transactions',
    'parts_stock',
    'parts',
    'service_records',
    'service_appointments',
    'test_ride_bookings',
    'sales_invoices',
    'customer_vehicles',
    'inventory',
    'customers',
    'showroom_brands',
    'showroom_subscriptions',
    'billing_configurations',
    'showroom_branding',
    'showroom_addresses',
  ]

  for (const table of scopedTables) {
    await supabase.from(table).delete().eq('showroom_id', id)
  }

  await supabase.from('showrooms').delete().eq('id', id)

  if (showroom?.owner_id) {
    await supabase.from('showroom_users').delete().eq('id', showroom.owner_id)
  }

  return NextResponse.json({ success: true })
}
