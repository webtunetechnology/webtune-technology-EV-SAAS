import Razorpay from 'razorpay'
import crypto from 'crypto'

const keyId = process.env.RAZORPAY_KEY_ID
const keySecret = process.env.RAZORPAY_KEY_SECRET

export function getRazorpayKeyId(): string | null {
  return keyId || null
}

export function isRazorpayConfigured(): boolean {
  return Boolean(keyId && keySecret)
}

/**
 * Server-side Razorpay client. Throws if credentials are missing.
 */
export function getRazorpayClient(): Razorpay {
  if (!keyId || !keySecret) {
    throw new Error('Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.')
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret })
}

/**
 * Verify the signature returned by Razorpay Checkout after a successful payment.
 */
export function verifyPaymentSignature(params: {
  orderId: string
  paymentId: string
  signature: string
}): boolean {
  if (!keySecret) return false
  const expected = crypto
    .createHmac('sha256', keySecret)
    .update(`${params.orderId}|${params.paymentId}`)
    .digest('hex')
  // Constant-time comparison
  const a = Buffer.from(expected)
  const b = Buffer.from(params.signature || '')
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}
