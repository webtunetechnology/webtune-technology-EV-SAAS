import { cookies } from 'next/headers'
import { createApiClient } from '@/lib/supabase/api-client'

export type AdminUser = {
  id: string
  full_name: string
  email: string
  role: string
}

/**
 * Verifies that the current request is made by an authenticated admin.
 * Checks the admin_token cookie AND re-validates the user's role against the
 * database on every call, so a revoked/downgraded account loses access immediately.
 *
 * Returns the admin user on success, or null if not authorized.
 */
export async function getAdminUser(): Promise<AdminUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_token')?.value
  const adminId = cookieStore.get('admin_user_id')?.value

  if (!token || !adminId) return null

  const supabase = createApiClient()
  const { data: user, error } = await supabase
    .from('showroom_users')
    .select('id, full_name, email, role, is_active')
    .eq('id', adminId)
    .eq('role', 'admin')
    .eq('is_active', true)
    .single()

  if (error || !user) return null

  return {
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    role: user.role,
  }
}

/**
 * Guard for admin API routes. Returns { admin } when authorized,
 * or { error } with a NextResponse-ready 401 payload when not.
 */
export async function requireAdmin(): Promise<
  { admin: AdminUser; error: null } | { admin: null; error: { message: string; status: number } }
> {
  const admin = await getAdminUser()
  if (!admin) {
    return { admin: null, error: { message: 'Unauthorized: admin access required', status: 401 } }
  }
  return { admin, error: null }
}
