// app/api/technicians/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createApiClient } from '@/lib/supabase/api-client';

export async function GET(request: NextRequest) {
  try {
    const supabase = createApiClient();
    
    const { data, error } = await supabase
      .from('showroom_users')
      .select('id, full_name, email, mobile_number')
      .eq('is_active', true)
      .order('full_name', { ascending: true });
    
    if (error) {
      console.error('Error fetching technicians:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch technicians' 
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('Error in technicians API:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}