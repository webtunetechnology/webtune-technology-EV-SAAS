import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createApiClient } from '@/lib/supabase/api-client'

async function showroomNameMap(supabase: any, ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))]
  if (!unique.length) return new Map<string, string>()
  const { data } = await supabase.from('showrooms').select('id, showroom_name').in('id', unique)
  return new Map((data || []).map((s: any) => [s.id, s.showroom_name]))
}

// GET: every customer across all showrooms
export async function GET(request: Request) {
  const { error } = await requireAdmin()
  if (error) return NextResponse.json({ error: error.message }, { status: error.status })

  const supabase = createApiClient()
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')?.trim()
  const showroomId = searchParams.get('showroom_id')?.trim()

  let query = supabase
    .from('customers')
    .select('id, first_name, last_name, mobile, email, city, state, customer_type, customer_status, lead_status, total_vehicles_owned, total_purchase_amount, showroom_id, created_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1000)

  if (showroomId) query = query.eq('showroom_id', showroomId)
  if (search) query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,mobile.ilike.%${search}%,email.ilike.%${search}%`)

  const { data, error: qErr } = await query
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 })

  const names = await showroomNameMap(supabase, (data || []).map((c) => c.showroom_id))
  const result = (data || []).map((c) => ({ ...c, showroom_name: names.get(c.showroom_id) || null }))

  return NextResponse.json({ success: true, data: result, total: result.length })
}
