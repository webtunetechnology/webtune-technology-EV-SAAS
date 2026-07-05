'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { ShieldX, User } from 'lucide-react'
import Link from 'next/link'

// The only dashboard page a suspended account can access
const ALLOWED_WHILE_SUSPENDED = '/dashboard/profile'

export function SuspensionGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [suspended, setSuspended] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    let active = true
    fetch('/api/account-status', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { suspended: false }))
      .then((data) => {
        if (!active) return
        setSuspended(data.suspended === true)
        setChecked(true)
      })
      .catch(() => {
        if (!active) return
        // Fail open — never lock a user out due to a fetch error
        setSuspended(false)
        setChecked(true)
      })
    return () => { active = false }
  }, [pathname])

  // While checking, render children normally (avoids flash of suspension screen)
  if (!checked) return <>{children}</>

  // Profile page is always accessible so the user can log out
  if (!suspended || pathname?.startsWith(ALLOWED_WHILE_SUSPENDED)) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-red-100 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <ShieldX className="h-8 w-8 text-red-600" />
        </div>

        <h2 className="mt-6 text-2xl font-bold text-gray-900">Account Suspended</h2>

        <p className="mt-3 text-sm leading-relaxed text-gray-500">
          Your account has been suspended by the system administrator.
          You cannot access this page until your account is reactivated.
        </p>

        <p className="mt-2 text-sm text-gray-500">
          Please contact the system administrator to resolve this.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="/dashboard/profile"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
          >
            <User className="h-4 w-4" />
            Go to Profile
          </Link>
        </div>

        <p className="mt-6 text-xs text-gray-400">
          If you believe this is a mistake, contact{' '}
          <span className="font-medium text-gray-600">your system administrator</span>.
        </p>
      </div>
    </div>
  )
}
