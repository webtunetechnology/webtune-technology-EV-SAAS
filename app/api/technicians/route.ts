// app/api/technicians/route.ts
// Since there is only 1 user per showroom, this endpoint now returns
// only the current showroom's own user rather than all showroom_users.
import { NextRequest, NextResponse } from 'next/server';
import { createApiClient } from '@/lib/supabase/api-client';

export async function GET(request: NextRequest) {
  try {
    const supabase = createApiClient();
    const showroom_id = request.cookies.get('showroom_id')?.value;
    const user_id = request.cookies.get('user_id')?.value;

    if (!showroom_id || !user_id) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Only return the single user that belongs to this showroom session
    const { data, error } = await supabase
      .from('showroom_users')
      .select('id, full_name, email, mobile_number')
      .eq('id', user_id)
      .eq('is_active', true)
      .limit(1);

    if (error) {
      console.error('Error fetching technician:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch technician' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error in technicians API:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
