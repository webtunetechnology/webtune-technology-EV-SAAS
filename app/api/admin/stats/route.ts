import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createApiClient } from '@/lib/supabase/api-client'

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return NextResponse.json({ error: error.message }, { status: error.status })

  const supabase = createApiClient()

  const count = async (table: string, filter?: (q: any) => any) => {
    let q = supabase.from(table).select('*', { count: 'exact', head: true })
    if (filter) q = filter(q)
    const { count: c } = await q
    return c || 0
  }

  const [
    showrooms,
    activeVendors,
    suspendedVendors,
    users,
    customers,
    vehicles,
    inventory,
    inventoryAvailable,
    invoices,
    serviceRecords,
    plans,
  ] = await Promise.all([
    count('showrooms'),
    count('showroom_users', (q) => q.eq('role', 'showroom_owner').eq('is_active', true)),
    count('showroom_users', (q) => q.eq('role', 'showroom_owner').eq('is_active', false)),
    count('showroom_users'),
    count('customers'),
    count('vehicles'),
    count('inventory'),
    count('inventory', (q) => q.eq('stock_status', 'available')),
    count('sales_invoices'),
    count('service_records'),
    count('subscription_plans'),
  ])

  // Total sales revenue across the platform (sum of invoice on-road-ish totals)
  const { data: invoiceRows } = await supabase
    .from('sales_invoices')
    .select('ex_showroom_price, cgst_amount, sgst_amount, accessories_amount, is_cancelled')

  let totalRevenue = 0
  for (const row of invoiceRows || []) {
    if (row.is_cancelled) continue
    totalRevenue +=
      (Number(row.ex_showroom_price) || 0) +
      (Number(row.cgst_amount) || 0) +
      (Number(row.sgst_amount) || 0) +
      (Number(row.accessories_amount) || 0)
  }

  return NextResponse.json({
    success: true,
    stats: {
      showrooms,
      activeVendors,
      suspendedVendors,
      users,
      customers,
      vehicles,
      inventory,
      inventoryAvailable,
      invoices,
      serviceRecords,
      plans,
      totalRevenue,
    },
  })
}
