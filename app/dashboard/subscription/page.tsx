'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Check, Crown, Sparkles, AlertTriangle, Loader2, CalendarClock } from 'lucide-react'

type Plan = {
  id: string
  plan_name: string
  description: string | null
  price: number
  billing_cycle: string
  max_users: number | null
  max_vehicles: number | null
  features: string[]
  is_active: boolean
}

type Access = {
  hasAccess: boolean
  status: 'trial' | 'active' | 'expired' | 'pending' | 'cancelled' | 'none'
  isTrial: boolean
  daysLeft: number
  expiresAt: string | null
}

type SubscriptionResponse = {
  subscription: {
    plan_id: string | null
    payment_status: string | null
    is_trial: boolean
    subscription_expiry: string | null
    plan?: Plan | null
  } | null
  access: Access
  plans: Plan[]
}

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json())

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false)
    if ((window as any).Razorpay) return resolve(true)
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0)
}

function StatusCard({ access, planName }: { access: Access; planName: string | null }) {
  const map: Record<Access['status'], { label: string; cls: string; icon: React.ReactNode }> = {
    trial: { label: 'Free Trial', cls: 'bg-blue-50 text-blue-700 border-blue-200', icon: <Sparkles className="h-4 w-4" /> },
    active: { label: 'Active', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <Check className="h-4 w-4" /> },
    expired: { label: 'Expired', cls: 'bg-red-50 text-red-700 border-red-200', icon: <AlertTriangle className="h-4 w-4" /> },
    pending: { label: 'Payment Pending', cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: <CalendarClock className="h-4 w-4" /> },
    cancelled: { label: 'Cancelled', cls: 'bg-gray-100 text-gray-700 border-gray-200', icon: <AlertTriangle className="h-4 w-4" /> },
    none: { label: 'No Subscription', cls: 'bg-gray-100 text-gray-700 border-gray-200', icon: <AlertTriangle className="h-4 w-4" /> },
  }
  const s = map[access.status]

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500">Current Plan</p>
          <h3 className="mt-1 text-xl font-bold text-gray-900">{planName || (access.isTrial ? 'Trial Access' : 'None')}</h3>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${s.cls}`}>
          {s.icon}
          {s.label}
        </span>
      </div>

      {access.expiresAt && (
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
          <CalendarClock className="h-4 w-4 text-gray-400" />
          {access.hasAccess ? (
            <span>
              {access.daysLeft} day{access.daysLeft === 1 ? '' : 's'} left — renews / expires on{' '}
              <span className="font-medium text-gray-900">
                {new Date(access.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </span>
          ) : (
            <span className="text-red-600">
              Expired on{' '}
              {new Date(access.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          )}
        </div>
      )}

      {access.isTrial && access.hasAccess && (
        <p className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
          You&apos;re on a free trial. Choose a plan below to keep your dashboard active after the trial ends.
        </p>
      )}
      {!access.hasAccess && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Your access is inactive. Subscribe to a plan below to unlock your dashboard.
        </p>
      )}
    </div>
  )
}

export default function SubscriptionPage() {
  const { data, isLoading, mutate } = useSWR<SubscriptionResponse>('/api/subscription', fetcher)
  const [processingPlan, setProcessingPlan] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const access = data?.access
  // Only show paid plans — the free trial isn't something a vendor "subscribes" to.
  const plans = (data?.plans || []).filter((p) => Number(p.price) > 0)
  const currentPlanId = data?.subscription?.plan_id || null
  const currentPlanName = data?.subscription?.plan?.plan_name || null

  const handleSubscribe = async (plan: Plan) => {
    setMessage(null)
    setProcessingPlan(plan.id)

    try {
      const ok = await loadRazorpayScript()
      if (!ok) {
        setMessage({ type: 'error', text: 'Could not load payment gateway. Please try again.' })
        setProcessingPlan(null)
        return
      }

      const orderRes = await fetch('/api/subscription/checkout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: plan.id, billing_cycle: plan.billing_cycle }),
      })
      const order = await orderRes.json()

      if (!orderRes.ok) {
        setMessage({ type: 'error', text: order.error || 'Failed to start payment.' })
        setProcessingPlan(null)
        return
      }

      const rzp = new (window as any).Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: 'EV Portal Subscription',
        description: `${plan.plan_name} (${plan.billing_cycle})`,
        order_id: order.order_id,
        theme: { color: '#00C853' },
        handler: async (response: any) => {
          const verifyRes = await fetch('/api/subscription/verify', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          })
          const verify = await verifyRes.json()
          if (verifyRes.ok) {
            setMessage({ type: 'success', text: `${plan.plan_name} activated successfully!` })
            mutate()
          } else {
            setMessage({ type: 'error', text: verify.error || 'Payment verification failed.' })
          }
          setProcessingPlan(null)
        },
        modal: {
          ondismiss: () => setProcessingPlan(null),
        },
      })

      rzp.on('payment.failed', (resp: any) => {
        setMessage({ type: 'error', text: resp?.error?.description || 'Payment failed.' })
        setProcessingPlan(null)
      })

      rzp.open()
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Something went wrong.' })
      setProcessingPlan(null)
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
          <Crown className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Subscription</h1>
          <p className="text-sm text-gray-500">Manage your plan and billing.</p>
        </div>
      </div>

      {message && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {isLoading || !access ? (
        <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white py-16 text-gray-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading subscription...
        </div>
      ) : (
        <>
          <StatusCard access={access} planName={currentPlanName} />

          <div>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Available Plans</h2>
            {plans.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">
                No plans are available right now. Please check back later.
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {plans.map((plan) => {
                  const isCurrent = plan.id === currentPlanId && access.status === 'active'
                  const busy = processingPlan === plan.id
                  return (
                    <div
                      key={plan.id}
                      className={`flex flex-col rounded-xl border bg-white p-6 shadow-sm transition-all ${
                        isCurrent ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-gray-200 hover:border-emerald-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-gray-900">{plan.plan_name}</h3>
                        {isCurrent && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            Current
                          </span>
                        )}
                      </div>
                      {plan.description && <p className="mt-1 text-sm text-gray-500">{plan.description}</p>}

                      <div className="mt-4 flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-gray-900">{formatINR(plan.price)}</span>
                        <span className="text-sm text-gray-500">/ {plan.billing_cycle}</span>
                      </div>

                      <ul className="mt-5 flex flex-1 flex-col gap-2 text-sm text-gray-600">
                        {(plan.max_users != null) && (
                          <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-emerald-500" /> Up to {plan.max_users} users
                          </li>
                        )}
                        {(plan.max_vehicles != null) && (
                          <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-emerald-500" /> Up to {plan.max_vehicles} vehicles
                          </li>
                        )}
                        {(plan.features || []).map((f, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-emerald-500" /> {f}
                          </li>
                        ))}
                      </ul>

                      <button
                        onClick={() => handleSubscribe(plan)}
                        disabled={busy || isCurrent}
                        className={`mt-6 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                          isCurrent
                            ? 'cursor-default bg-gray-100 text-gray-400'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60'
                        }`}
                      >
                        {busy ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" /> Processing...
                          </>
                        ) : isCurrent ? (
                          'Active Plan'
                        ) : (
                          `Subscribe ${formatINR(plan.price)}`
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
