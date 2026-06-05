// app/api/customer-vehicles/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createApiClient } from '@/lib/supabase/api-client';

export async function GET(request: NextRequest) {
  try {
    const supabase = createApiClient();
    const searchParams = request.nextUrl.searchParams;
    
    const customer_id = searchParams.get('customer_id');
    const vehicle_status = searchParams.get('vehicle_status');
    
    let query = supabase
      .from('customer_vehicles')
      .select(`
        id,
        chassis_number,
        registration_number,
        current_odometer_km,
        vehicle_status,
        vehicle_model:vehicles(
          id,
          model_name,
          brand:brands(brand_name)
        )
      `);
    
    if (customer_id) {
      query = query.eq('customer_id', customer_id);
    }
    
    if (vehicle_status) {
      query = query.eq('vehicle_status', vehicle_status);
    } else {
      // Default to active vehicles
      query = query.in('vehicle_status', ['Active', 'Under Repair']);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching customer vehicles:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch vehicles' 
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('Error in customer vehicles API:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}