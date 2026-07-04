import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api-client'
import { verifyPaymentSignature } from '@/lib/razorpay'
import { addDays, cycleDays } from '@/lib/subscription'

function getShowroomId(request: NextRequest): string | null {
  return request.cookies.get('showroom_id')?.value || null
}

// POST: verify Razorpay payment signature and activate the subscription
export async function POST(request: NextRequest) {
  const showroomId = getShowroomId(request)
  if (!showroomId) {
    return NextResponse.json({ error: 'Unauthorized - No showroom found' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ error: 'Missing payment verification fields' }, { status: 400 })
  }

  const validSignature = verifyPaymentSignature({
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature,
  })

  const supabase = createApiClient()

  // Look up the pending payment we created at checkout time.
  const { data: payment } = await supabase
    .from('subscription_payments')
    .select('*')
    .eq('razorpay_order_id', razorpay_order_id)
    .eq('showroom_id', showroomId)
    .maybeSingle()

  if (!validSignature) {
    if (payment) {
      await supabase
        .from('subscription_payments')
        .update({ status: 'failed', razorpay_payment_id, razorpay_signature, updated_at: new Date().toISOString() })
        .eq('id', payment.id)
    }
    return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 })
  }

  if (!payment) {
    return NextResponse.json({ error: 'Payment record not found' }, { status: 404 })
  }

  const now = new Date()
  const days = cycleDays(payment.billing_cycle)
  const expiry = addDays(now, days)

  // Activate the subscription (one row per showroom, enforced by unique index).
  const { error: subErr } = await supabase
    .from('showroom_subscriptions')
    .update({
      plan_id: payment.plan_id,
      billing_cycle: payment.billing_cycle,
      payment_status: 'active',
      is_trial: false,
      amount: payment.amount,
      subscription_start: now.toISOString(),
      subscription_expiry: expiry,
      razorpay_order_id,
      razorpay_payment_id,
      updated_at: now.toISOString(),
    })
    .eq('showroom_id', showroomId)

  if (subErr) {
    console.error('Failed to activate subscription:', subErr)
    return NextResponse.json({ error: 'Failed to activate subscription' }, { status: 500 })
  }

  await supabase
    .from('subscription_payments')
    .update({ status: 'paid', razorpay_payment_id, razorpay_signature, updated_at: now.toISOString() })
    .eq('id', payment.id)

  return NextResponse.json({ success: true, subscription_expiry: expiry })
}
