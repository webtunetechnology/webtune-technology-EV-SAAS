'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
    <div className="min-h-screen flex">
      {/* Left — illustrative art background */}
      <div
        className="hidden lg:flex flex-1 relative overflow-hidden"
        style={{ backgroundImage: "url('/images/admin-login-bg.png')", backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-slate-950/60" />

        {/* Branding overlay */}
        <div className="relative z-10 flex flex-col justify-between p-10 w-full">
          {/* Top badge */}
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <span className="text-white font-semibold text-base tracking-wide">EV SaaS Platform</span>
          </div>

          {/* Centre headline */}
          <div>
            <h2 className="text-4xl font-bold text-white leading-tight text-balance mb-3">
              Platform Administration
            </h2>
            <p className="text-slate-300 text-base leading-relaxed max-w-sm">
              Master control panel for managing showrooms, subscriptions, and the entire EV dealership network.
            </p>
          </div>

          {/* Bottom tag */}
          <p className="text-slate-500 text-xs">
            Restricted access · Authorised administrators only
          </p>
        </div>
      </div>

      {/* Right — login form */}
      <div className="flex flex-1 items-center justify-center bg-white px-6 py-12 lg:max-w-md xl:max-w-lg">
        <div className="w-full max-w-sm">
          {/* Mobile brand header (shown only on small screens) */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-base leading-tight">EV SaaS Platform</p>
              <p className="text-xs text-slate-500">Admin Panel</p>
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
            <p className="text-slate-500 text-sm">Sign in to the admin panel to continue</p>
          </div>

          {error && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-5">
            <div>
              <Label htmlFor="email" className="text-slate-700 font-medium text-sm">
                Admin Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@evsaas.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={onKeyDown}
                className="mt-1.5 border-slate-200 focus-visible:ring-primary"
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-slate-700 font-medium text-sm">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={onKeyDown}
                className="mt-1.5 border-slate-200 focus-visible:ring-primary"
                disabled={loading}
              />
            </div>

            <Button
              onClick={handleLogin}
              disabled={loading || !email || !password}
              className="w-full h-11 text-sm font-semibold"
            >
              {loading ? 'Signing in...' : 'Sign In to Admin Panel'}
            </Button>
          </div>

          <p className="text-center text-xs text-slate-400 mt-8">
            Restricted access. Authorised platform administrators only.
          </p>
        </div>
      </div>
    </div>
  )
}
