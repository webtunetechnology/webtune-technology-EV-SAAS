'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ShieldCheck } from 'lucide-react'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    setError('')
    if (!email || !password) {
      setError('Please enter email and password')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.error || 'Invalid credentials')
        setLoading(false)
        return
      }

      window.location.replace('/admin')
    } catch (err) {
      console.error('Admin login error:', err)
      setError('Failed to login. Please try again.')
      setLoading(false)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !(e.nativeEvent as any).isComposing) {
      handleLogin()
    }
  }

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat flex items-center justify-center p-4"
      style={{ backgroundImage: "url('https://res.cloudinary.com/doficc2yl/image/upload/v1778936343/ChatGPT_Image_May_16_2026_06_06_15_PM_zmj8wf.png')" }}
    >
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image
              src="https://res.cloudinary.com/doficc2yl/image/upload/v1778937807/WhatsApp_Image_2026-05-10_at_4.45.44_PM_ikm7ay.jpg"
              alt="Webtune Technology Logo"
              width={68}
              height={68}
              className="rounded-lg"
              priority
            />
          </div>
          <h1 className="text-2xl font-bold text-black mb-1">Webtune Technology</h1>
          <p className="text-slate-300 text-sm">Admin Control Panel</p>
        </div>

        <Card className="bg-white border-slate-200">
          <div className="p-6">
            {/* Admin badge */}
            <div className="flex items-center gap-2 mb-5 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
              <p className="text-xs text-slate-600 font-medium">Platform Administrator Access</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-slate-700 font-medium">
                  Admin Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@evsaas.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={onKeyDown}
                  className="mt-1 border-slate-200 focus:ring-primary"
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-slate-700 font-medium">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={onKeyDown}
                  className="mt-1 border-slate-200 focus:ring-primary"
                  disabled={loading}
                />
              </div>

              <Button
                onClick={handleLogin}
                disabled={loading || !email || !password}
                className="w-full bg-primary hover:bg-primary/90 text-white"
              >
                {loading ? 'Signing in...' : 'Sign In to Admin Panel'}
              </Button>
            </div>
          </div>
        </Card>

        <p className="text-center text-xs text-slate-400 mt-6">
          Restricted access. Authorised platform administrators only.
        </p>
      </div>
    </div>
  )
}
