import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createApiClient } from '@/lib/supabase/api-client'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin()
  if (error) return NextResponse.json({ error: error.message }, { status: error.status })

  const { id } = await params
  const supabase = createApiClient()
  const body = await request.json()
  if (!body.brand_name?.trim()) {
    return NextResponse.json({ error: 'Brand name is required' }, { status: 400 })
  }

  const { error: uErr } = await supabase
    .from('brands')
    .update({ brand_name: body.brand_name.trim(), updated_at: new Date().toISOString() })
    .eq('id', id)
  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin()
  if (error) return NextResponse.json({ error: error.message }, { status: error.status })

  const { id } = await params
  const supabase = createApiClient()

  const { count } = await supabase
    .from('vehicles')
    .select('*', { count: 'exact', head: true })
    .eq('brand_id', id)

  if (count && count > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${count} vehicle model(s) belong to this brand.` },
      { status: 400 }
    )
  }

  const { error: dErr } = await supabase.from('brands').delete().eq('id', id)
  if (dErr) return NextResponse.json({ error: dErr.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
