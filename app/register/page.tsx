'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// Types for stored data
interface UserData {
  id: string;
  full_name: string;
  email: string;
  mobile_number: string;
  role: string;
  is_mobile_verified: boolean;
  is_email_verified: boolean;
  auth_provider: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

interface ShowroomData {
  id: string;
  showroom_name: string;
  business_type: string | null;
  gst_number: string | null;
  pan_number: string | null;
  business_registration_type: string | null;
  created_at: string;
  updated_at: string;
}

interface CompleteAuthData {
  user: UserData;
  showroom: ShowroomData;
  showroom_addresses: any[];
  showroom_branding: any | null;
  billing_configuration: any | null;
  subscription: any | null;
  session_token: string;
  login_timestamp: string;
}

function RegisterContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [emailFromUrl, setEmailFromUrl] = useState('')

  useEffect(() => {
    setEmailFromUrl(searchParams?.get('email') || '')
  }, [searchParams])

  const [step, setStep] = useState<'email' | 'otp' | 'details'>(emailFromUrl ? 'otp' : 'email')
  const [email, setEmail] = useState(emailFromUrl)
  const [otp, setOtp] = useState('')
  const [generatedOtp, setGeneratedOtp] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [mobileNumber, setMobileNumber] = useState('')
  const [password, setPassword] = useState('')
  const [showroomName, setShowroomName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [otpExpiry, setOtpExpiry] = useState<number | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [resendCooldown, setResendCooldown] = useState(0)

  // Timer for OTP expiry
  useEffect(() => {
    if (otpExpiry && step === 'otp') {
      const interval = setInterval(() => {
        const remaining = Math.max(0, Math.floor((otpExpiry - Date.now()) / 1000))
        setTimeLeft(remaining)
        if (remaining === 0) {
          clearInterval(interval)
          setError('OTP has expired. Please request a new one.')
        }
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [otpExpiry, step])

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  // Helper function to store all auth data across storage types
  const storeAuthData = (completeData: CompleteAuthData) => {
    const {
      user,
      showroom,
      showroom_addresses,
      showroom_branding,
      billing_configuration,
      subscription,
      session_token,
      login_timestamp
    } = completeData

    // Prepare data objects for storage
    const authData = {
      session_token,
      user_logged_in: true,
      login_timestamp,
      user,
      showroom,
      showroom_addresses,
      showroom_branding,
      billing_configuration,
      subscription
    }

    // 1. Store in localStorage (persistent)
    localStorage.setItem('auth_token', session_token)
    localStorage.setItem('user_logged_in', 'true')
    localStorage.setItem('login_timestamp', login_timestamp)
    localStorage.setItem('user', JSON.stringify(user))
    localStorage.setItem('showroom', JSON.stringify(showroom))
    localStorage.setItem('showroom_addresses', JSON.stringify(showroom_addresses))
    localStorage.setItem('showroom_branding', JSON.stringify(showroom_branding))
    localStorage.setItem('billing_configuration', JSON.stringify(billing_configuration))
    localStorage.setItem('subscription', JSON.stringify(subscription))
    localStorage.setItem('complete_auth_data', JSON.stringify(authData))

    // 2. Store in sessionStorage (tab-specific backup)
    sessionStorage.setItem('auth_token', session_token)
    sessionStorage.setItem('user_logged_in', 'true')
    sessionStorage.setItem('login_timestamp', login_timestamp)
    sessionStorage.setItem('user', JSON.stringify(user))
    sessionStorage.setItem('showroom', JSON.stringify(showroom))
    sessionStorage.setItem('showroom_addresses', JSON.stringify(showroom_addresses))
    sessionStorage.setItem('showroom_branding', JSON.stringify(showroom_branding))
    sessionStorage.setItem('billing_configuration', JSON.stringify(billing_configuration))
    sessionStorage.setItem('subscription', JSON.stringify(subscription))
    sessionStorage.setItem('complete_auth_data', JSON.stringify(authData))

    // 3. Store in cookies (for middleware and server-side access)
    const cookieOptions = `path=/; max-age=604800; SameSite=Lax` // 7 days
    document.cookie = `auth_token=${session_token}; ${cookieOptions}`
    document.cookie = `user_logged_in=true; ${cookieOptions}`
    document.cookie = `user_email=${encodeURIComponent(user.email)}; ${cookieOptions}`
    document.cookie = `user_id=${user.id}; ${cookieOptions}`
    document.cookie = `user_name=${encodeURIComponent(user.full_name)}; ${cookieOptions}`
    document.cookie = `user_mobile=${encodeURIComponent(user.mobile_number || '')}; ${cookieOptions}`
    document.cookie = `user_role=${user.role}; ${cookieOptions}`
    document.cookie = `showroom_id=${showroom.id}; ${cookieOptions}`
    document.cookie = `showroom_name=${encodeURIComponent(showroom.showroom_name)}; ${cookieOptions}`
    document.cookie = `login_timestamp=${login_timestamp}; ${cookieOptions}`

    // Store additional showroom info in cookies
    if (showroom_branding) {
      document.cookie = `showroom_logo=${encodeURIComponent(showroom_branding.logo_url || '')}; ${cookieOptions}`
      document.cookie = `showroom_primary_color=${showroom_branding.primary_color || ''}; ${cookieOptions}`
    }

    // Store primary address in cookie if exists
    const primaryAddress = showroom_addresses?.find((addr: any) => addr.is_primary)
    if (primaryAddress) {
      document.cookie = `showroom_city=${encodeURIComponent(primaryAddress.city)}; ${cookieOptions}`
      document.cookie = `showroom_state=${encodeURIComponent(primaryAddress.state)}; ${cookieOptions}`
    }

    console.log('✅ All authentication data stored successfully after registration')
    console.log('Storage locations: localStorage, sessionStorage, cookies')
    console.log('Data stored:', {
      user: user.email,
      showroom: showroom.showroom_name,
      addresses_count: showroom_addresses?.length || 0,
      has_branding: !!showroom_branding,
      has_billing: !!billing_configuration,
      has_subscription: !!subscription
    })
  }

  // Generate random 6-digit OTP
  const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  // Send email using EmailJS
  const sendEmailOTP = async (emailAddress: string, otpCode: string) => {
    try {
      // Send via the server-side route (uses the EmailJS REST API).
      // This avoids depending on NEXT_PUBLIC_* client-bundle inlining and keeps keys off the browser.
      const response = await fetch('/api/auth/send-otp-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailAddress, otp_code: otpCode }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok || !data.success) {
        const text = data?.error || 'Unknown error'
        console.error('[v0] Email sending failed:', response.status, text)
        setError(`Failed to send OTP email: ${text}`)
        return false
      }

      return true
    } catch (error: any) {
      const text = error?.message || 'Network error'
      console.error('[v0] Email sending failed:', text)
      setError(`Failed to send OTP email: ${text}`)
      return false
    }
  }

  const handleSendOtp = async () => {
    setError('')
    
    if (!email) {
      setError('Please enter your email address')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address')
      return
    }

    setLoading(true)
    try {
      // First check if email already exists
      const checkResponse = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      
      const checkData = await checkResponse.json()
      
      if (checkData.exists) {
        setError('Account with this email already exists. Please login.')
        setLoading(false)
        return
      }

      // Generate new OTP
      const newOtp = generateOTP()
      setGeneratedOtp(newOtp)
      
      // Send email via EmailJS
      const emailSent = await sendEmailOTP(email, newOtp)
      
      if (!emailSent) {
        // sendEmailOTP already sets a detailed error message
        setError((prev) => prev || 'Failed to send OTP email. Please try again.')
        setLoading(false)
        return
      }

      // Store OTP in backend
      const storeResponse = await fetch('/api/auth/store-email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          otp_code: newOtp,
          purpose: 'signup'
        }),
      })

      if (!storeResponse.ok) {
        setError('Failed to store OTP. Please try again.')
        setLoading(false)
        return
      }

      // Set expiry time (5 minutes from now)
      setOtpExpiry(Date.now() + 5 * 60 * 1000)
      setResendCooldown(30)
      setStep('otp')
      setError('')
    } catch (err) {
      setError('Failed to send OTP')
      console.error('Send OTP error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    setError('')
    
    if (!otp) {
      setError('Please enter the OTP')
      return
    }

    if (timeLeft === 0) {
      setError('OTP has expired. Please request a new one.')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/auth/verify-email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp_code: otp }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to verify OTP')
        return
      }

      if (data.user_exists) {
        router.push('/login?message=Account exists. Please login.')
        return
      }

      setStep('details')
    } catch (err) {
      setError('Failed to verify OTP')
      console.error('Verify OTP error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    setError('')

    if (!firstName || !mobileNumber || !password || !showroomName) {
      setError('Please fill in all required fields')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    const phoneRegex = /^[6-9]\d{9}$/
    if (!phoneRegex.test(mobileNumber)) {
      setError('Please enter a valid 10-digit mobile number')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          mobile_number: mobileNumber,
          password,
          first_name: firstName,
          last_name: lastName,
          showroom_name: showroomName,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to register')
        return
      }

      // Check if complete data is returned from the API
      if (data.complete_data) {
        // Store all comprehensive auth data
        storeAuthData(data.complete_data)
        console.log('Registration successful with complete data')
      } else if (data.user && data.showroom) {
        // Fallback: Create complete data structure from available data
        const loginTimestamp = new Date().toISOString()
        const sessionToken = data.session_token || `session_${Date.now()}_${Math.random().toString(36)}`
        
        const completeData: CompleteAuthData = {
          user: {
            id: data.user.id,
            full_name: `${firstName} ${lastName}`.trim(),
            email: email,
            mobile_number: mobileNumber,
            role: 'admin',
            is_mobile_verified: false,
            is_email_verified: true,
            auth_provider: 'both',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_login_at: loginTimestamp
          },
          showroom: {
            id: data.showroom.id,
            showroom_name: showroomName,
            business_type: null,
            gst_number: null,
            pan_number: null,
            business_registration_type: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          showroom_addresses: [],
          showroom_branding: null,
          billing_configuration: null,
          subscription: null,
          session_token: sessionToken,
          login_timestamp: loginTimestamp
        }
        
        storeAuthData(completeData)
        console.log('Registration successful with fallback data structure')
      } else {
        console.warn('No complete data returned from registration API')
      }

      // Redirect to dashboard
      router.push('/dashboard')
    } catch (err) {
      setError('Failed to register')
      console.error('Register error:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat flex items-center justify-center p-4" style={{ backgroundImage: "url('https://res.cloudinary.com/doficc2yl/image/upload/v1778936343/ChatGPT_Image_May_16_2026_06_06_15_PM_zmj8wf.png')" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image
              src="https://res.cloudinary.com/doficc2yl/image/upload/v1778937807/WhatsApp_Image_2026-05-10_at_4.45.44_PM_ikm7ay.jpg"
              alt="Webtune Technology Logo"
              width={68}
              height={68}
              className="rounded-lg"
            />
          </div>
          <h1 className="text-2xl font-bold text-black mb-1">Webtune Technology</h1>
          <p className="text-slate-300 text-sm">Join EV Dealership Platform</p>
        </div>

        <Card className="bg-white border-slate-200">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${['email', 'otp', 'details'].indexOf(step) >= 0 ? 'bg-primary text-white' : 'bg-slate-200 text-slate-600'}`}>1</div>
              <div className={`h-1 flex-1 mx-2 ${['otp', 'details'].includes(step) ? 'bg-primary' : 'bg-slate-200'}`} />
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${['otp', 'details'].includes(step) ? 'bg-primary text-white' : 'bg-slate-200 text-slate-600'}`}>2</div>
              <div className={`h-1 flex-1 mx-2 ${step === 'details' ? 'bg-primary' : 'bg-slate-200'}`} />
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${step === 'details' ? 'bg-primary text-white' : 'bg-slate-200 text-slate-600'}`}>3</div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {step === 'email' && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email" className="text-slate-700 font-medium">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 border-slate-200 focus:ring-primary"
                    disabled={loading}
                    autoFocus
                  />
                  <p className="text-xs text-slate-500 mt-1">We'll send a verification code to this email</p>
                </div>
                <Button onClick={handleSendOtp} disabled={loading || !email} className="w-full bg-primary hover:bg-primary/90 text-white">
                  {loading ? 'Sending OTP...' : 'Send Verification Code'}
                </Button>
              </div>
            )}

            {step === 'otp' && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="otp" className="text-slate-700 font-medium">Enter Verification Code</Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="mt-1 border-slate-200 focus:ring-primary text-center tracking-widest text-lg"
                    disabled={loading}
                    autoFocus
                  />
                  <p className="text-xs text-slate-500 mt-1 text-center">
                    Code sent to {email}
                    {timeLeft > 0 && ` • Expires in ${formatTime(timeLeft)}`}
                  </p>
                </div>

                {/* Development mode - show OTP for testing */}
                {process.env.NODE_ENV === 'development' && generatedOtp && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-600 mb-2 font-semibold">📧 Test Mode - OTP sent to your email:</p>
                    <div className="flex items-center justify-between">
                      <code className="font-mono font-bold text-blue-900 text-xl tracking-wider">{generatedOtp}</code>
                      <button 
                        onClick={() => { 
                          navigator.clipboard.writeText(generatedOtp)
                          setOtp(generatedOtp)
                        }} 
                        className="text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
                      >
                        Copy & Fill
                      </button>
                    </div>
                  </div>
                )}

                <Button 
                  onClick={handleVerifyOtp} 
                  disabled={loading || otp.length !== 6 || timeLeft === 0} 
                  className="w-full bg-primary hover:bg-primary/90 text-white"
                >
                  {loading ? 'Verifying...' : 'Verify Code'}
                </Button>

                <button 
                  onClick={handleSendOtp} 
                  disabled={loading || resendCooldown > 0} 
                  className="w-full text-sm text-primary hover:text-primary/80 underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendCooldown > 0 ? `Resend available in ${resendCooldown}s` : 'Resend Code'}
                </button>
              </div>
            )}

            {step === 'details' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="firstName" className="text-slate-700 font-medium text-sm">First Name *</Label>
                    <Input 
                      id="firstName" 
                      placeholder="John" 
                      value={firstName} 
                      onChange={(e) => setFirstName(e.target.value)} 
                      className="mt-1 border-slate-200 focus:ring-primary" 
                      disabled={loading} 
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="text-slate-700 font-medium text-sm">Last Name</Label>
                    <Input 
                      id="lastName" 
                      placeholder="Doe" 
                      value={lastName} 
                      onChange={(e) => setLastName(e.target.value)} 
                      className="mt-1 border-slate-200 focus:ring-primary" 
                      disabled={loading} 
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="mobileNumber" className="text-slate-700 font-medium">Mobile Number *</Label>
                  <Input 
                    id="mobileNumber" 
                    type="tel"
                    placeholder="9876543210" 
                    value={mobileNumber} 
                    onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))} 
                    className="mt-1 border-slate-200 focus:ring-primary" 
                    disabled={loading} 
                  />
                  <p className="text-xs text-slate-500 mt-1">Enter your 10-digit mobile number</p>
                </div>

                <div>
                  <Label htmlFor="showroom" className="text-slate-700 font-medium">Showroom Name *</Label>
                  <Input 
                    id="showroom" 
                    placeholder="My EV Showroom" 
                    value={showroomName} 
                    onChange={(e) => setShowroomName(e.target.value)} 
                    className="mt-1 border-slate-200 focus:ring-primary" 
                    disabled={loading} 
                  />
                </div>

                <div>
                  <Label htmlFor="password" className="text-slate-700 font-medium">Password *</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    className="mt-1 border-slate-200 focus:ring-primary" 
                    disabled={loading} 
                  />
                  <p className="text-xs text-slate-500 mt-1">Minimum 8 characters</p>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-xs text-green-700 flex items-center gap-2">
                    ✓ Email <strong>{email}</strong> verified successfully
                  </p>
                </div>

                <Button onClick={handleRegister} disabled={loading} className="w-full bg-primary hover:bg-primary/90 text-white">
                  {loading ? 'Creating account...' : 'Create Account'}
                </Button>
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-slate-200 text-center">
              <p className="text-slate-600 text-sm">
                Already have an account?{' '}
                <Link href="/login" className="text-primary hover:text-primary/80 font-medium">Login</Link>
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-cover bg-center bg-no-repeat flex items-center justify-center" style={{ backgroundImage: "url('https://res.cloudinary.com/doficc2yl/image/upload/v1778936343/ChatGPT_Image_May_16_2026_06_06_15_PM_zmj8wf.png')" }}>
        <div className="text-white">Loading...</div>
      </div>
    }>
      <RegisterContent />
    </Suspense>
  )
}
