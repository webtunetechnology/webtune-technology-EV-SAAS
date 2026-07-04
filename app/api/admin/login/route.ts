import { createApiClient } from '@/lib/supabase/api-client'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const supabase = createApiClient()

    // Only admins may log in here
    const { data: user, error: userError } = await supabase
      .from('showroom_users')
      .select('id, full_name, email, password_hash, role, is_active')
      .eq('email', email)
      .eq('role', 'admin')
      .eq('is_active', true)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid credentials or not an admin account' },
        { status: 401 }
      )
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash)
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    const adminToken = crypto.randomBytes(64).toString('hex')
    const loginTimestamp = new Date().toISOString()

    await supabase
      .from('showroom_users')
      .update({ last_login_at: loginTimestamp })
      .eq('id', user.id)

    const response = NextResponse.json({
      success: true,
      admin: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
      },
    })

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    }

    // HTTP-only session token
    response.cookies.set('admin_token', adminToken, cookieOptions)
    // Identity cookies (admin_user_id is re-validated against the DB on every request)
    response.cookies.set('admin_user_id', user.id, cookieOptions)
    response.cookies.set('admin_name', user.full_name, { ...cookieOptions, httpOnly: false })
    response.cookies.set('admin_email', user.email, { ...cookieOptions, httpOnly: false })
    response.cookies.set('admin_logged_in', 'true', { ...cookieOptions, httpOnly: false })

    return response
  } catch (error) {
    console.error('Admin login error:', error)
    return NextResponse.json({ error: 'Failed to login' }, { status: 500 })
  }
}
