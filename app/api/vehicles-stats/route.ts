// app/api/vehicles-stats/route.ts (Simplified version)
import { NextRequest, NextResponse } from 'next/server';
import { createApiClient } from '@/lib/supabase/api-client';

function getShowroomIdFromCookies(request: NextRequest): string | null {
  return request.cookies.get('showroom_id')?.value || null;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createApiClient();
    const showroomId = getShowroomIdFromCookies(request);
    
    // Get brand IDs for this showroom
    let brandIds: string[] = [];
    
    if (showroomId) {
      const { data: showroomBrands } = await supabase
        .from('showroom_brands')
        .select('brand_id')
        .eq('showroom_id', showroomId);
      
      brandIds = showroomBrands?.map(sb => sb.brand_id) || [];
    }
    
    // If showroom exists but has no brands, return zeros
    if (showroomId && brandIds.length === 0) {
      return NextResponse.json({
        success: true,
        stats: {
          total: 0, active: 0, discontinued: 0,
          scooterCount: 0, motorcycleCount: 0, carCount: 0,
          rickshawCount: 0, busCount: 0,
          averageRange: 0, averagePrice: 0
        }
      });
    }
    
    // Build a single query to get all vehicle data
    let query = supabase.from('vehicles').select('*');
    
    if (brandIds.length > 0) {
      query = query.in('brand_id', brandIds);
    }
    
    const { data: vehicles, error } = await query;
    
    if (error) {
      throw error;
    }
    
    const vehicleList = vehicles || [];
    
    // Calculate stats from the retrieved data
    const stats = {
      total: vehicleList.length,
      active: vehicleList.filter(v => v.is_active && !v.is_discontinued).length,
      discontinued: vehicleList.filter(v => v.is_discontinued).length,
      scooterCount: vehicleList.filter(v => v.vehicle_type === 'Electric Scooter').length,
      motorcycleCount: vehicleList.filter(v => v.vehicle_type === 'Electric Motorcycle').length,
      carCount: vehicleList.filter(v => v.vehicle_type === 'Electric Car').length,
      rickshawCount: vehicleList.filter(v => v.vehicle_type === 'Electric Rickshaw').length,
      busCount: vehicleList.filter(v => v.vehicle_type === 'Electric Bus').length,
      averageRange: vehicleList.filter(v => v.range_per_charge_km).length > 0
        ? Math.round(vehicleList
            .filter(v => v.range_per_charge_km)
            .reduce((sum, v) => sum + (v.range_per_charge_km || 0), 0) / 
            vehicleList.filter(v => v.range_per_charge_km).length)
        : 0,
      averagePrice: vehicleList.filter(v => v.ex_showroom_price).length > 0
        ? Math.round(vehicleList
            .filter(v => v.ex_showroom_price)
            .reduce((sum, v) => sum + (v.ex_showroom_price || 0), 0) / 
            vehicleList.filter(v => v.ex_showroom_price).length)
        : 0,
    };
    
    return NextResponse.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching vehicle stats:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch vehicle statistics',
      stats: {
        total: 0, active: 0, discontinued: 0,
        scooterCount: 0, motorcycleCount: 0, carCount: 0,
        rickshawCount: 0, busCount: 0,
        averageRange: 0, averagePrice: 0
      }
    }, { status: 500 });
  }
}