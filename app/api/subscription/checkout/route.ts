import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api-client'
import { getRazorpayClient, getRazorpayKeyId, isRazorpayConfigured } from '@/lib/razorpay'
import { cycleDays } from '@/lib/subscription'

function getShowroomId(request: NextRequest): string | null {
  return request.cookies.get('showroom_id')?.value || null
}

// POST: create a Razorpay order for a chosen plan
export async function POST(request: NextRequest) {
  const showroomId = getShowroomId(request)
  if (!showroomId) {
    return NextResponse.json({ error: 'Unauthorized - No showroom found' }, { status: 401 })
  }

  if (!isRazorpayConfigured()) {
    return NextResponse.json(
      { error: 'Payments are not configured. Please contact support.' },
      { status: 503 }
    )
  }

  const body = await request.json().catch(() => ({}))
  const { plan_id, billing_cycle } = body

  if (!plan_id) {
    return NextResponse.json({ error: 'plan_id is required' }, { status: 400 })
  }

  const supabase = createApiClient()

  const { data: plan, error: planErr } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('id', plan_id)
    .eq('is_active', true)
    .maybeSingle()

  if (planErr || !plan) {
    return NextResponse.json({ error: 'Selected plan is not available' }, { status: 404 })
  }

  const cycle = billing_cycle || plan.billing_cycle || 'monthly'
  const amount = Number(plan.price) || 0

  if (amount <= 0) {
    return NextResponse.json({ error: 'This plan has no payable amount' }, { status: 400 })
  }

  const amountPaise = Math.round(amount * 100)

  try {
    const razorpay = getRazorpayClient()
    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: `sub_${showroomId.slice(0, 8)}_${Date.now()}`,
      notes: { showroom_id: showroomId, plan_id, billing_cycle: cycle },
    })

    // Record the pending payment attempt for audit and later verification.
    await supabase.from('subscription_payments').insert({
      showroom_id: showroomId,
      plan_id,
      billing_cycle: cycle,
      amount,
      currency: 'INR',
      razorpay_order_id: order.id,
      status: 'created',
    })

    return NextResponse.json({
      success: true,
      order_id: order.id,
      amount: amountPaise,
      currency: 'INR',
      key_id: getRazorpayKeyId(),
      plan: { id: plan.id, plan_name: plan.plan_name, price: amount, billing_cycle: cycle, cycle_days: cycleDays(cycle) },
    })
  } catch (err: any) {
    console.error('Razorpay order creation failed:', err)
    return NextResponse.json({ error: err?.message || 'Failed to create payment order' }, { status: 500 })
  }
}
