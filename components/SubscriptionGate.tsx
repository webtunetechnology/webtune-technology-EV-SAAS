'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Lock, Loader2, AlertTriangle, Sparkles } from 'lucide-react'
import Link from 'next/link'

type Access = {
  hasAccess: boolean
  status: 'trial' | 'active' | 'expired' | 'pending' | 'cancelled' | 'none'
  isTrial: boolean
  daysLeft: number
  expiresAt: string | null
}

// Routes that must stay reachable even without an active subscription.
const ALLOWLIST = ['/dashboard/subscription']

export function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [access, setAccess] = useState<Access | null>(null)
  const [loading, setLoading] = useState(true)

  const isAllowlisted = ALLOWLIST.some((p) => pathname?.startsWith(p))

  useEffect(() => {
    let active = true
    fetch('/api/subscription', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active) return
        setAccess(data?.access || null)
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        // Fail open so a transient error never locks a paying vendor out.
        setAccess({ hasAccess: true, status: 'active', isTrial: false, daysLeft: 0, expiresAt: null })
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [pathname])

  // Trial expiry / renewal banner shown above the app when access is still valid.
  const banner =
    access && access.hasAccess && access.isTrial ? (
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-blue-800">
          <Sparkles className="h-4 w-4" />
          <span>
            You&apos;re on a free trial — {access.daysLeft} day{access.daysLeft === 1 ? '' : 's'} left.
          </span>
        </div>
        <Link
          href="/dashboard/subscription"
          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
        >
          Upgrade Now
        </Link>
      </div>
    ) : null

  // The subscription page always renders (so users can pay/renew).
  if (isAllowlisted) {
    return <>{children}</>
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-gray-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Checking subscription...
      </div>
    )
  }

  // Blocked: no active subscription.
  if (access && !access.hasAccess) {
    const expired = access.status === 'expired'
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
            {expired ? <AlertTriangle className="h-7 w-7" /> : <Lock className="h-7 w-7" />}
          </div>
          <h2 className="mt-5 text-xl font-bold text-gray-900">
            {expired ? 'Your subscription has expired' : 'Subscription required'}
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            {expired
              ? 'Your free trial or plan has ended. Renew your subscription to continue using the dashboard.'
              : 'Choose a plan to unlock your showroom dashboard and all its features.'}
          </p>
          <button
            onClick={() => router.push('/dashboard/subscription')}
            className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            View Plans &amp; Subscribe
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      {banner}
      {children}
    </>
  )
}
