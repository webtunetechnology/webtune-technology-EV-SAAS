import { createApiClient } from '@/lib/supabase/api-client'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { TRIAL_DAYS } from '@/lib/subscription'

export async function POST(request: Request) {
  try {
    const { mobile_number, email, password, first_name, last_name, showroom_name } = await request.json()
    const supabase = createApiClient()
    
    console.log('Registration request for:', email, mobile_number)
    
    // Validate required fields
    if (!mobile_number || !email || !password || !first_name || !showroom_name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Validate mobile number
    const mobileRegex = /^[6-9]\d{9}$/
    if (!mobileRegex.test(mobile_number)) {
      return NextResponse.json(
        { error: 'Invalid mobile number format' },
        { status: 400 }
      )
    }
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }
    
    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }
    
    // Check if EMAIL OTP was verified
    const { data: otpVerification, error: otpError } = await supabase
      .from('user_otps')
      .select('id')
      .eq('email', email)
      .eq('purpose', 'signup')
      .eq('is_verified', true)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .maybeSingle()
    
    console.log('Email OTP verification check:', { otpVerification, otpError })
    
    if (otpError) {
      console.error('Error checking OTP verification:', otpError)
      return NextResponse.json(
        { error: `Database error: ${otpError.message}` },
        { status: 500 }
      )
    }
    
    if (!otpVerification) {
      return NextResponse.json(
        { error: 'Email not verified. Please verify OTP first.' },
        { status: 400 }
      )
    }
    
    // Check if user already exists
    const { data: existingUser, error: userCheckError } = await supabase
      .from('showroom_users')
      .select('id')
      .or(`mobile_number.eq.${mobile_number},email.eq.${email}`)
      .maybeSingle()
    
    if (userCheckError) {
      console.error('Error checking existing user:', userCheckError)
      return NextResponse.json(
        { error: `Database error: ${userCheckError.message}` },
        { status: 500 }
      )
    }
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this mobile number or email already exists' },
        { status: 400 }
      )
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)
    const fullName = `${first_name} ${last_name}`.trim()
    const now = new Date().toISOString()
    
    // Create user
    const { data: newUser, error: createUserError } = await supabase
      .from('showroom_users')
      .insert({
        full_name: fullName,
        mobile_number: mobile_number,
        email: email,
        password_hash: hashedPassword,
        role: 'admin',
        is_mobile_verified: false,
        is_email_verified: true,
        auth_provider: 'both',
        is_active: true,
        created_at: now,
        updated_at: now
      })
      .select('*')
      .single()
    
    if (createUserError) {
      console.error('Error creating user:', createUserError)
      return NextResponse.json(
        { error: `Failed to create user: ${createUserError.message}` },
        { status: 500 }
      )
    }
    
    console.log('User created with ID:', newUser.id)
    
    // Create showroom
    const { data: newShowroom, error: createShowroomError } = await supabase
      .from('showrooms')
      .insert({
        owner_id: newUser.id,
        showroom_name: showroom_name,
        business_type: 'ev_dealership',
        created_at: now,
        updated_at: now
      })
      .select('*')
      .single()
    
    if (createShowroomError) {
      console.error('Error creating showroom:', createShowroomError)
      await supabase.from('showroom_users').delete().eq('id', newUser.id)
      return NextResponse.json(
        { error: `Failed to create showroom: ${createShowroomError.message}` },
        { status: 500 }
      )
    }
    
    console.log('Showroom created with ID:', newShowroom.id)
    
    // Create billing configuration
    const { data: billingConfig, error: billingError } = await supabase
      .from('billing_configurations')
      .insert({
        showroom_id: newShowroom.id,
        invoice_prefix: 'INV',
        default_gst_percentage: 18,
        invoice_sequence: 1,
        created_at: now,
        updated_at: now
      })
      .select('*')
      .single()
    
    if (billingError) {
      console.error('Error creating billing config:', billingError)
      // Don't fail the registration, just log the error
    }
    
    // Create showroom branding
    const { data: branding, error: brandingError } = await supabase
      .from('showroom_branding')
      .insert({
        showroom_id: newShowroom.id,
        created_at: now,
        updated_at: now
      })
      .select('*')
      .single()
    
    if (brandingError) {
      console.error('Error creating branding:', brandingError)
      // Don't fail the registration, just log the error
    }
    
    // Fetch any addresses (none yet, but structure for consistency)
    const { data: addresses } = await supabase
      .from('showroom_addresses')
      .select('*')
      .eq('showroom_id', newShowroom.id)
    
    // Auto-start a free trial subscription so the vendor can use the dashboard immediately.
    const trialStart = new Date(now)
    const trialExpiry = new Date(trialStart)
    trialExpiry.setDate(trialExpiry.getDate() + TRIAL_DAYS)

    let subscription = null
    const { data: newSubscription, error: subscriptionError } = await supabase
      .from('showroom_subscriptions')
      .insert({
        showroom_id: newShowroom.id,
        plan_id: null,
        billing_cycle: null,
        payment_status: 'trial',
        is_trial: true,
        amount: 0,
        subscription_start: trialStart.toISOString(),
        subscription_expiry: trialExpiry.toISOString(),
        created_at: now,
        updated_at: now,
      })
      .select('*')
      .single()

    if (subscriptionError) {
      console.error('Error creating trial subscription:', subscriptionError)
      // Don't fail the registration, just log the error
    } else {
      subscription = newSubscription
    }
    
    // Mark OTP as used
    await supabase
      .from('user_otps')
      .update({ is_verified: true })
      .eq('email', email)
      .eq('purpose', 'signup')
    
    // Generate session token
    const sessionToken = crypto.randomBytes(32).toString('hex')
    const loginTimestamp = now
    
    // Prepare complete user data
    const completeUserData = {
      id: newUser.id,
      full_name: newUser.full_name,
      email: newUser.email,
      mobile_number: newUser.mobile_number,
      role: newUser.role,
      is_mobile_verified: newUser.is_mobile_verified,
      is_email_verified: newUser.is_email_verified,
      auth_provider: newUser.auth_provider,
      is_active: newUser.is_active,
      created_at: newUser.created_at,
      updated_at: newUser.updated_at,
      last_login_at: loginTimestamp
    }
    
    // Prepare complete showroom data
    const completeShowroomData = {
      id: newShowroom.id,
      showroom_name: newShowroom.showroom_name,
      business_type: newShowroom.business_type,
      gst_number: newShowroom.gst_number,
      pan_number: newShowroom.pan_number,
      business_registration_type: newShowroom.business_registration_type,
      created_at: newShowroom.created_at,
      updated_at: newShowroom.updated_at
    }
    
    // Prepare complete data for frontend storage
    const completeData = {
      user: completeUserData,
      showroom: completeShowroomData,
      showroom_addresses: addresses || [],
      showroom_branding: branding || null,
      billing_configuration: billingConfig || null,
      subscription: subscription || null,
      session_token: sessionToken,
      login_timestamp: loginTimestamp
    }
    
    const authToken = crypto.randomBytes(64).toString('hex')

    const response = NextResponse.json({ 
      success: true, 
      user_id: newUser.id,
      showroom_id: newShowroom.id,
      session_token: sessionToken,
      complete_data: completeData,  // ← This contains all data for storage
      user: completeUserData,       // ← Backward compatibility
      showroom: completeShowroomData, // ← Backward compatibility
      message: 'Registration successful' 
    })

    // Set auth cookies so the dashboard and all data routes work immediately after signup
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    }
    response.cookies.set('auth_token', authToken, cookieOptions)
    response.cookies.set('user_id', newUser.id, { ...cookieOptions, httpOnly: false })
    response.cookies.set('user_name', newUser.full_name, { ...cookieOptions, httpOnly: false })
    response.cookies.set('user_email', newUser.email, { ...cookieOptions, httpOnly: false })
    response.cookies.set('user_logged_in', 'true', { ...cookieOptions, httpOnly: false })
    response.cookies.set('showroom_id', newShowroom.id, { ...cookieOptions, httpOnly: false })
    response.cookies.set('showroom_name', newShowroom.showroom_name, { ...cookieOptions, httpOnly: false })

    return response
    
  } catch (error) {
    console.error('Registration error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to create account: ${message}` },
      { status: 500 }
    )
  }
}
