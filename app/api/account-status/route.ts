import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api-client'

export async function GET(request: NextRequest) {
  const userId = request.cookies.get('user_id')?.value
  if (!userId) {
    return NextResponse.json({ suspended: false, error: 'No session' }, { status: 401 })
  }

  const supabase = createApiClient()
  const { data, error } = await supabase
    .from('showroom_users')
    .select('is_active')
    .eq('id', userId)
    .single()

  if (error || !data) {
    // Fail open — don't lock out on a transient DB error
    return NextResponse.json({ suspended: false })
  }

  return NextResponse.json({ suspended: !data.is_active })
}
