import 'server-only'
import { createApiClient } from '@/lib/supabase/api-client'
import {
  DEFAULT_LANDING_CONTENT,
  mergeLandingContent,
  type LandingContent,
} from '@/lib/landing-content'

/**
 * Reads the single landing_page_content row and merges the stored (partial)
 * content over the defaults. Falls back to defaults on any error so the
 * public landing page always renders.
 */
export async function getLandingContent(): Promise<LandingContent> {
  try {
    const supabase = createApiClient()
    const { data, error } = await supabase
      .from('landing_page_content')
      .select('content')
      .eq('id', 'default')
      .single()
    if (error || !data) return DEFAULT_LANDING_CONTENT
    return mergeLandingContent(data.content)
  } catch {
    return DEFAULT_LANDING_CONTENT
  }
}
