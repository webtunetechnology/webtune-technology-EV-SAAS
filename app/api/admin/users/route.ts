import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createApiClient } from '@/lib/supabase/api-client'

// GET: list every user across the platform, with their showroom (if owner)
export async function GET(request: Request) {
  const { error } = await requireAdmin()
  if (error) return NextResponse.json({ error: error.message }, { status: error.status })

  const supabase = createApiClient()
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')?.trim()
  const role = searchParams.get('role')?.trim()

  let query = supabase
    .from('showroom_users')
    .select('id, full_name, email, mobile_number, role, is_active, is_email_verified, is_mobile_verified, auth_provider, last_login_at, created_at')
    .order('created_at', { ascending: false })

  if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
  if (role) query = query.eq('role', role)

  const { data: users, error: qErr } = await query
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 })

  // Attach owned showroom names
  const userIds = (users || []).map((u) => u.id)
  const { data: showrooms } = await supabase
    .from('showrooms')
    .select('id, showroom_name, owner_id')
    .in('owner_id', userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000'])

  const showroomByOwner = new Map((showrooms || []).map((s) => [s.owner_id, s]))

  const result = (users || []).map((u) => ({
    ...u,
    showroom: showroomByOwner.get(u.id) || null,
  }))

  return NextResponse.json({ success: true, data: result, total: result.length })
}
