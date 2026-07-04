import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createApiClient } from '@/lib/supabase/api-client'
import bcrypt from 'bcryptjs'

// PATCH: update a user (role, active status, name, mobile, or reset password)
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { admin, error } = await requireAdmin()
  if (error) return NextResponse.json({ error: error.message }, { status: error.status })

  const { id } = await params
  const supabase = createApiClient()
  const body = await request.json()

  const updates: Record<string, any> = { updated_at: new Date().toISOString() }
  if ('full_name' in body) updates.full_name = body.full_name
  if ('mobile_number' in body) updates.mobile_number = body.mobile_number
  if ('role' in body) updates.role = body.role
  if (typeof body.is_active === 'boolean') updates.is_active = body.is_active

  // Optional password reset
  if (body.new_password) {
    updates.password_hash = await bcrypt.hash(body.new_password, 10)
  }

  // Guard: an admin cannot deactivate or demote themselves
  if (id === admin!.id && (body.is_active === false || (body.role && body.role !== 'admin'))) {
    return NextResponse.json({ error: 'You cannot deactivate or change your own admin role' }, { status: 400 })
  }

  const { error: uErr } = await supabase.from('showroom_users').update(updates).eq('id', id)
  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

// DELETE: remove a user account
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { admin, error } = await requireAdmin()
  if (error) return NextResponse.json({ error: error.message }, { status: error.status })

  const { id } = await params
  if (id === admin!.id) {
    return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 })
  }

  const supabase = createApiClient()

  // Block deleting a user who owns a showroom (must delete the showroom first)
  const { data: ownedShowroom } = await supabase.from('showrooms').select('id').eq('owner_id', id).maybeSingle()
  if (ownedShowroom) {
    return NextResponse.json(
      { error: 'This user owns a showroom. Delete the showroom first from the Vendors page.' },
      { status: 400 }
    )
  }

  const { error: dErr } = await supabase.from('showroom_users').delete().eq('id', id)
  if (dErr) return NextResponse.json({ error: dErr.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
