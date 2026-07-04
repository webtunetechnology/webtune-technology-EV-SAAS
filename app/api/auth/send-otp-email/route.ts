import { NextResponse } from 'next/server'

/**
 * Sends a registration OTP email via the EmailJS REST API from the server.
 *
 * This runs server-side (instead of the EmailJS browser SDK) so that:
 *  - The EmailJS keys never depend on Next.js `NEXT_PUBLIC_*` client-bundle inlining,
 *    which can be stale when env vars are added after a build.
 *  - The template params exactly match the EmailJS template ({{otp_code}}, {{email}}, {{to_email}}).
 */
export async function POST(request: Request) {
  try {
    const { email, otp_code } = await request.json()

    if (!email || !otp_code) {
      return NextResponse.json(
        { success: false, error: 'Missing email or otp_code' },
        { status: 400 }
      )
    }

    const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID
    const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID
    const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY
    // Optional: set this if your EmailJS account uses "strict mode" / private key
    const privateKey = process.env.EMAILJS_PRIVATE_KEY

    if (!serviceId || !templateId || !publicKey) {
      console.error('[v0] EmailJS server config missing', {
        hasServiceId: !!serviceId,
        hasTemplateId: !!templateId,
        hasPublicKey: !!publicKey,
      })
      return NextResponse.json(
        { success: false, error: 'Email service is not configured.' },
        { status: 500 }
      )
    }

    const payload: Record<string, unknown> = {
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,
      template_params: {
        email,
        otp_code,
        to_email: email,
      },
    }

    // Include the private key only if configured (required when strict mode is on).
    if (privateKey) {
      payload.accessToken = privateKey
    }

    // EmailJS validates the origin for browser (public key) requests.
    // Reuse the caller's origin so it matches your EmailJS allowed origins in any environment.
    const requestOrigin =
      request.headers.get('origin') ||
      (() => {
        try {
          return new URL(request.url).origin
        } catch {
          return 'http://localhost:3000'
        }
      })()

    const emailjsResponse = await fetch(
      'https://api.emailjs.com/api/v1.0/email/send',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          origin: requestOrigin,
        },
        body: JSON.stringify(payload),
      }
    )

    const responseText = await emailjsResponse.text()

    if (!emailjsResponse.ok) {
      console.error('[v0] EmailJS send failed:', emailjsResponse.status, responseText)
      return NextResponse.json(
        { success: false, error: responseText || 'Failed to send email' },
        { status: 502 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[v0] send-otp-email error:', error?.message || error)
    return NextResponse.json(
      { success: false, error: 'Failed to send OTP email' },
      { status: 500 }
    )
  }
}
