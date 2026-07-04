import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ success: true })
  const names = ['admin_token', 'admin_user_id', 'admin_name', 'admin_email', 'admin_logged_in']
  for (const name of names) {
    response.cookies.set(name, '', { path: '/', maxAge: 0 })
  }
  return response
}
