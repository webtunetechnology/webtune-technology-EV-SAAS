import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createApiClient } from '@/lib/supabase/api-client'

// GET: all brands with model counts
export async function GET() {
  const { error } = await requireAdmin()
  if (error) return NextResponse.json({ error: error.message }, { status: error.status })

  const supabase = createApiClient()
  const { data, error: qErr } = await supabase.from('brands').select('*').order('brand_name')
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 })

  const { data: vehicles } = await supabase.from('vehicles').select('brand_id')
  const counts: Record<string, number> = {}
  for (const v of vehicles || []) counts[v.brand_id] = (counts[v.brand_id] || 0) + 1

  const result = (data || []).map((b) => ({ ...b, model_count: counts[b.id] || 0 }))
  return NextResponse.json({ success: true, data: result, total: result.length })
}

// POST: create a brand
export async function POST(request: Request) {
  const { error } = await requireAdmin()
  if (error) return NextResponse.json({ error: error.message }, { status: error.status })

  const supabase = createApiClient()
  const body = await request.json()
  if (!body.brand_name?.trim()) {
    return NextResponse.json({ error: 'Brand name is required' }, { status: 400 })
  }

  const { data, error: iErr } = await supabase
    .from('brands')
    .insert({ brand_name: body.brand_name.trim() })
    .select()
    .single()
  if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 })

  return NextResponse.json({ success: true, data })
}
