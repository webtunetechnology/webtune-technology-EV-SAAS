import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const AUTH_COOKIES = [
  'auth_token',
  'user_logged_in',
  'user_id',
  'user_email',
  'user_role',
  'showroom_id',
  'showroom_name',
  'showroom_logo',
  'showroom_primary_color',
  'showroom_city',
  'showroom_state',
  'login_timestamp',
]

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    for (const name of AUTH_COOKIES) {
      cookieStore.delete(name)
    }

    return NextResponse.json(
      { success: true, message: 'Logged out successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
