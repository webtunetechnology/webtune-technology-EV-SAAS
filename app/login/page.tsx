'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff } from 'lucide-react'
import emailjs from '@emailjs/browser'

// Initialize EmailJS
emailjs.init(process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || '')

// Types for stored data
interface UserData {
  id: string
  full_name: string
  email: string
  mobile_number: string | null
  role: string
  is_mobile_verified: boolean
  is_email_verified: boolean
  auth_provider: string
  is_active: boolean
  created_at: string
  updated_at: string
  last_login_at: string | null
}

interface ShowroomData {
  id: string
  showroom_name: string
  business_type: string | null
  gst_number: string | null
  pan_number: string | null
  business_registration_type: string | null
  created_at: string
  updated_at: string
}

interface ShowroomAddressData {
  id: string
  address_line_1: string
  address_line_2: string | null
  landmark: string | null
  state: string
  city: string
  pincode: string
  latitude: number | null
  longitude: number | null
  is_primary: boolean
}

interface ShowroomBrandingData {
  id: string
  logo_url: string | null
  banner_url: string | null
  primary_color: string | null
  secondary_color: string | null
  official_mobile_number: string | null
  whatsapp_number: string | null
  support_email: string | null
  website_url: string | null
}

interface BillingConfigData {
  id: string
  invoice_prefix: string
  default_gst_percentage: number
  invoice_footer_note: string | null
  authorized_signature_url: string | null
  bank_name: string | null
  account_number: string | null
  ifsc_code: string | null
  upi_id: string | null
  invoice_sequence: number
}

interface ShowroomSubscriptionData {
  id: string
  plan_id: string
  billing_cycle: string | null
  coupon_code: string | null
  payment_status: string
  subscription_start: string
  subscription_expiry: string | null
  is_trial: boolean
}

interface CompleteAuthData {
  user: UserData
  showroom: ShowroomData
  showroom_addresses: ShowroomAddressData[]
  showroom_branding: ShowroomBrandingData | null
  billing_configuration: BillingConfigData | null
  subscription: ShowroomSubscriptionData | null
  session_token: string
  login_timestamp: string
}

export default function LoginPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'email' | 'password'>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [error, setError] = useState('')
  const [displayOtp, setDisplayOtp] = useState('')
  const [generatedOtp, setGeneratedOtp] = useState('')
  const [otpExpiry, setOtpExpiry] = useState<number | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [resendCooldown, setResendCooldown] = useState(0)
  const hasCheckedRef = useRef(false)

  // Timer for OTP expiry
  useEffect(() => {
    if (otpExpiry && otpSent) {
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
  }, [otpExpiry, otpSent])

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  // Check if already logged in - only once
  useEffect(() => {
    if (hasCheckedRef.current) return
    hasCheckedRef.current = true
    
    const checkLoggedIn = () => {
      // Check cookies
      const cookies = document.cookie.split('; ')
      const authToken = cookies.find(row => row.startsWith('auth_token='))
      const userLoggedIn = cookies.find(row => row.startsWith('user_logged_in='))
      
      // Check localStorage
      const localToken = localStorage.getItem('auth_token')
      const localLoggedIn = localStorage.getItem('user_logged_in')
      
      const isLoggedIn = (userLoggedIn?.split('=')[1] === 'true') || 
                         !!authToken || 
                         localLoggedIn === 'true' || 
                         !!localToken
      
      if (isLoggedIn) {
        window.location.href = '/dashboard'
      }
    }
    
    checkLoggedIn()
  }, [])

  // Helper function to set all auth data across storage types
  const setCompleteAuthData = (data: CompleteAuthData) => {
    const {
      user,
      showroom,
      showroom_addresses,
      showroom_branding,
      billing_configuration,
      subscription,
      session_token,
      login_timestamp
    } = data

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
    document.cookie = `showroom_id=${showroom.id}; ${cookieOptions}`
    document.cookie = `showroom_name=${encodeURIComponent(showroom.showroom_name)}; ${cookieOptions}`
    document.cookie = `user_role=${user.role}; ${cookieOptions}`
    document.cookie = `login_timestamp=${login_timestamp}; ${cookieOptions}`

    // Store additional showroom info in cookies
    if (showroom_branding) {
      document.cookie = `showroom_logo=${encodeURIComponent(showroom_branding.logo_url || '')}; ${cookieOptions}`
      document.cookie = `showroom_primary_color=${showroom_branding.primary_color || ''}; ${cookieOptions}`
    }

    // Store primary address in cookie
    const primaryAddress = showroom_addresses.find(addr => addr.is_primary)
    if (primaryAddress) {
      document.cookie = `showroom_city=${encodeURIComponent(primaryAddress.city)}; ${cookieOptions}`
      document.cookie = `showroom_state=${encodeURIComponent(primaryAddress.state)}; ${cookieOptions}`
    }

    console.log('✅ All authentication data stored successfully')
    console.log('Storage locations: localStorage, sessionStorage, cookies')
    console.log('Data stored:', {
      user: user.email,
      showroom: showroom.showroom_name,
      addresses_count: showroom_addresses.length,
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
      const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID
      const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID

      if (!serviceId || !templateId) {
        console.error('EmailJS configuration missing')
        return false
      }

      const templateParams = {
        email: emailAddress,
        otp_code: otpCode,
        to_email: emailAddress,
      }

      console.log('Sending login OTP to:', emailAddress)
      
      const response = await emailjs.send(
        serviceId,
        templateId,
        templateParams
      )

      console.log('EmailJS response:', response)
      return response.status === 200
    } catch (error) {
      console.error('Email sending failed:', error)
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
      // Check if email exists
      const checkResponse = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      
      const checkData = await checkResponse.json()
      
      if (!checkData.exists) {
        setError('No account found with this email. Please register first.')
        setLoading(false)
        return
      }

      // Generate new OTP
      const newOtp = generateOTP()
      setGeneratedOtp(newOtp)
      
      // Send email via EmailJS
      const emailSent = await sendEmailOTP(email, newOtp)
      
      if (!emailSent) {
        setError('Failed to send OTP email. Please try again.')
        setLoading(false)
        return
      }

      // Store OTP in backend for login purpose
      const storeResponse = await fetch('/api/auth/store-email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          otp_code: newOtp,
          purpose: 'login'
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
      setOtpSent(true)
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
      const response = await fetch('/api/auth/verify-login-email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          otp_code: otp
        }),
      })

      const data = await response.json()

      console.log('Verify OTP response:', data)

      if (!response.ok) {
        setError(data.error || 'Failed to verify OTP')
        return
      }

      if (data.success && data.complete_data) {
        // Store all comprehensive auth data
        setCompleteAuthData(data.complete_data)
        
        // Force hard redirect to dashboard
        window.location.replace('/dashboard')
      } else {
        setError('Login failed. Please try again.')
      }
    } catch (err) {
      setError('Failed to verify OTP')
      console.error('Verify OTP error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordLogin = async () => {
    setError('')
    if (!email || !password) {
      setError('Please enter email and password')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          password,
          login_type: 'password'
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Invalid email or password')
        return
      }

      if (data.success && data.complete_data) {
        // Store all comprehensive auth data
        setCompleteAuthData(data.complete_data)
        
        // Force hard redirect to dashboard
        window.location.replace('/dashboard')
      }
    } catch (err) {
      setError('Failed to login')
      console.error('Password login error:', err)
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
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image
              src="https://res.cloudinary.com/doficc2yl/image/upload/v1778937807/WhatsApp_Image_2026-05-10_at_4.45.44_PM_ikm7ay.jpg"
              alt="Webtune Technology Logo"
              width={68}
              height={68}
              className="rounded-lg"
              priority
              loading="eager"
            />
          </div>
          <h1 className="text-2xl font-bold text-black mb-1">Webtune Technology</h1>
          <p className="text-slate-300 text-sm">Dealership Management Platform</p>
        </div>

        <Card className="bg-white border-slate-200">
          <div className="p-6">
            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-slate-200">
              <button
                onClick={() => {
                  setActiveTab('email')
                  setError('')
                  setOtpSent(false)
                  setOtp('')
                  setDisplayOtp('')
                  setGeneratedOtp('')
                  setTimeLeft(0)
                }}
                className={`pb-3 px-2 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'email'
                    ? 'text-primary border-primary'
                    : 'text-slate-600 border-transparent hover:text-slate-700'
                }`}
              >
                Email OTP
              </button>
              <button
                onClick={() => {
                  setActiveTab('password')
                  setError('')
                  setOtpSent(false)
                }}
                className={`pb-3 px-2 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'password'
                    ? 'text-primary border-primary'
                    : 'text-slate-600 border-transparent hover:text-slate-700'
                }`}
              >
                Email & Password
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Email OTP Tab */}
            {activeTab === 'email' && (
              <div className="space-y-4">
                {!otpSent ? (
                  <>
                    <div>
                      <Label htmlFor="email" className="text-slate-700 font-medium">
                        Email Address
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="john@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="mt-1 border-slate-200 focus:ring-primary"
                        disabled={loading}
                      />
                      <p className="text-xs text-slate-500 mt-1">Enter your registered email address</p>
                    </div>
                    <Button
                      onClick={handleSendOtp}
                      disabled={loading || !email}
                      className="w-full bg-primary hover:bg-primary/90 text-white"
                    >
                      {loading ? 'Sending...' : 'Send OTP'}
                    </Button>
                  </>
                ) : (
                  <>
                    <div>
                      <Label htmlFor="otp" className="text-slate-700 font-medium">
                        Enter OTP
                      </Label>
                      <Input
                        id="otp"
                        type="text"
                        placeholder="000000"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        maxLength={6}
                        className="mt-1 border-slate-200 focus:ring-primary text-center tracking-widest text-lg"
                        disabled={loading}
                      />
                      <p className="text-xs text-slate-500 mt-1 text-center">
                        OTP sent to {email}
                        {timeLeft > 0 && ` • Expires in ${formatTime(timeLeft)}`}
                      </p>
                    </div>

                    {/* Dev OTP Display */}
                    {(process.env.NODE_ENV === 'development' && generatedOtp) && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-xs text-amber-600 mb-2 font-semibold">🔧 Development Mode</p>
                        <div className="flex items-center justify-between">
                          <code className="font-mono font-bold text-amber-900 text-xl tracking-wider">{generatedOtp}</code>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(generatedOtp)
                              setOtp(generatedOtp)
                            }}
                            className="text-xs px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded transition-colors"
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
                      {loading ? 'Verifying...' : 'Verify OTP & Login'}
                    </Button>
                    
                    <button
                      onClick={() => {
                        setOtpSent(false)
                        setOtp('')
                        setDisplayOtp('')
                        setGeneratedOtp('')
                        setError('')
                        setTimeLeft(0)
                      }}
                      className="w-full text-sm text-primary hover:text-primary/80 underline"
                    >
                      Use different email address
                    </button>
                    
                    <button
                      onClick={handleSendOtp}
                      disabled={loading || resendCooldown > 0}
                      className="w-full text-sm text-slate-600 hover:text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {resendCooldown > 0 ? `Resend available in ${resendCooldown}s` : 'Resend OTP'}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Password Tab */}
            {activeTab === 'password' && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="login-email" className="text-slate-700 font-medium">
                    Email Address
                  </Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="user@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 border-slate-200 focus:ring-primary"
                    disabled={loading}
                  />
                </div>
                <div>
                  <Label htmlFor="password" className="text-slate-700 font-medium">
                    Password
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="border-slate-200 focus:ring-primary pr-10"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button
                  onClick={handlePasswordLogin}
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary/90 text-white"
                >
                  {loading ? 'Logging in...' : 'Login'}
                </Button>
                <Link href="/forgot-password" className="text-sm text-primary hover:text-primary/80 text-center block">
                  Forgot password?
                </Link>
              </div>
            )}

            {/* Sign Up Link */}
            <div className="mt-6 pt-6 border-t border-slate-200 text-center">
              <p className="text-slate-600 text-sm">
                Don&apos;t have an account?{' '}
                <Link href="/register" className="text-primary hover:text-primary/80 font-medium">
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
