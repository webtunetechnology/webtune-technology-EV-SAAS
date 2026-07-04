import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createApiClient } from '@/lib/supabase/api-client'
import { mergeLandingContent } from '@/lib/landing-content'

// GET: current landing content merged with defaults (admin only)
export async function GET() {
  const { error } = await requireAdmin()
  if (error) return NextResponse.json({ error: error.message }, { status: error.status })

  const supabase = createApiClient()
  const { data, error: qErr } = await supabase
    .from('landing_page_content')
    .select('content, updated_at')
    .eq('id', 'default')
    .single()

  if (qErr && qErr.code !== 'PGRST116') {
    return NextResponse.json({ error: qErr.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    data: mergeLandingContent(data?.content ?? {}),
    updated_at: data?.updated_at ?? null,
  })
}

// PUT: save the full landing content document (admin only)
export async function PUT(request: Request) {
  const { admin, error } = await requireAdmin()
  if (error) return NextResponse.json({ error: error.message }, { status: error.status })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: 'Content must be an object' }, { status: 400 })
  }

  // Normalise through the merge so the stored document is always complete/valid.
  const content = mergeLandingContent(body)

  const supabase = createApiClient()
  const { error: uErr } = await supabase
    .from('landing_page_content')
    .upsert(
      { id: 'default', content, updated_at: new Date().toISOString(), updated_by: admin.id },
      { onConflict: 'id' }
    )

  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 })

  return NextResponse.json({ success: true, data: content })
}
