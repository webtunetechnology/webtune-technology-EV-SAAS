import { createApiClient } from '@/lib/supabase/api-client'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

export async function POST(request: Request) {
  try {
    const { email, password, login_type } = await request.json()
    const supabase = createApiClient()
    
    if (login_type === 'password') {
      if (!email || !password) {
        return NextResponse.json(
          { error: 'Email and password are required' },
          { status: 400 }
        )
      }
      
      // Find user by email
      const { data: user, error: userError } = await supabase
        .from('showroom_users')
        .select('id, full_name, email, password_hash, role, is_active, mobile_number')
        .eq('email', email)
        .eq('is_active', true)
        .single()
      
      if (userError || !user) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        )
      }
      
      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash)
      
      if (!isValidPassword) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        )
      }
      
      // Get user's showroom
      const { data: showroom } = await supabase
        .from('showrooms')
        .select('*')
        .eq('owner_id', user.id)
        .single()

      // Fetch related showroom data for complete auth payload
      let addresses: any[] = []
      let branding: any = null
      let billingConfig: any = null
      let subscription: any = null

      if (showroom) {
        const [addressRes, brandingRes, billingRes, subscriptionRes] = await Promise.all([
          supabase.from('showroom_addresses').select('*').eq('showroom_id', showroom.id),
          supabase.from('showroom_branding').select('*').eq('showroom_id', showroom.id).maybeSingle(),
          supabase.from('billing_configurations').select('*').eq('showroom_id', showroom.id).maybeSingle(),
          supabase.from('showroom_subscriptions').select('*').eq('showroom_id', showroom.id).maybeSingle(),
        ])
        addresses = addressRes.data || []
        branding = brandingRes.data || null
        billingConfig = billingRes.data || null
        subscription = subscriptionRes.data || null
      }

      // Generate tokens
      const authToken = crypto.randomBytes(64).toString('hex')
      const sessionToken = crypto.randomBytes(32).toString('hex')
      const loginTimestamp = new Date().toISOString()

      // Update last login
      await supabase
        .from('showroom_users')
        .update({ last_login_at: loginTimestamp })
        .eq('id', user.id)

      const completeUserData = {
        id: user.id,
        full_name: user.full_name,
        name: user.full_name,
        email: user.email,
        mobile_number: user.mobile_number,
        role: user.role,
        is_active: user.is_active,
        last_login_at: loginTimestamp,
      }

      // Build complete data bundle expected by the login page
      const completeData = {
        user: completeUserData,
        showroom: showroom || null,
        showroom_addresses: addresses,
        showroom_branding: branding,
        billing_configuration: billingConfig,
        subscription: subscription,
        session_token: sessionToken,
        login_timestamp: loginTimestamp,
      }

      // Create response with cookie
      const response = NextResponse.json({
        success: true,
        user: completeUserData,
        showroom: showroom || null,
        session_token: sessionToken,
        complete_data: completeData,
      })
      
      // Cookie options shared across all auth cookies
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        maxAge: 60 * 60 * 24 * 7,
        path: '/'
      }

      // HTTP-only auth token
      response.cookies.set('auth_token', authToken, cookieOptions)

      // Client-readable identity cookies
      response.cookies.set('user_id', user.id, { ...cookieOptions, httpOnly: false })
      response.cookies.set('user_name', user.full_name, { ...cookieOptions, httpOnly: false })
      response.cookies.set('user_email', user.email, { ...cookieOptions, httpOnly: false })
      response.cookies.set('user_logged_in', 'true', { ...cookieOptions, httpOnly: false })

      // Showroom scoping cookies used by all data routes
      if (showroom) {
        response.cookies.set('showroom_id', showroom.id, { ...cookieOptions, httpOnly: false })
        response.cookies.set('showroom_name', showroom.showroom_name, { ...cookieOptions, httpOnly: false })
      }

      return response
    }
    
    return NextResponse.json(
      { error: 'Invalid login type' },
      { status: 400 }
    )
    
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Failed to login' },
      { status: 500 }
    )
  }
}
