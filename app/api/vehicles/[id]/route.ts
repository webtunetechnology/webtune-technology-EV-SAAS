// app/api/vehicles/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createApiClient } from '@/lib/supabase/api-client';

// Helper to get current user's showroom ID
async function getCurrentShowroomId(supabase: any): Promise<string | null> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return null;
    }
    
    // Check if user exists in showroom_users
    const { data: showroomUser, error: suError } = await supabase
      .from('showroom_users')
      .select('id, role')
      .eq('id', user.id)
      .single();
    
    if (suError || !showroomUser) {
      console.error('User not found in showroom_users:', suError);
      return null;
    }
    
    // Check if user is the owner of a showroom
    const { data: ownedShowroom } = await supabase
      .from('showrooms')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle();
    
    if (ownedShowroom) {
      return ownedShowroom.id;
    }
    
    // For admin users, get the first available showroom
    if (showroomUser.role === 'admin') {
      const { data: firstShowroom } = await supabase
        .from('showrooms')
        .select('id')
        .limit(1)
        .maybeSingle();
      
      return firstShowroom?.id || null;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting showroom ID:', error);
    return null;
  }
}

// Helper to check if a vehicle belongs to the showroom
async function vehicleBelongsToShowroom(
  supabase: any, 
  vehicleId: string, 
  showroomId: string
): Promise<boolean> {
  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('brand_id')
    .eq('id', vehicleId)
    .single();
  
  if (!vehicle) return false;
  
  const { data: showroomBrand } = await supabase
    .from('showroom_brands')
    .select('id')
    .eq('showroom_id', showroomId)
    .eq('brand_id', vehicle.brand_id)
    .maybeSingle();
  
  return !!showroomBrand;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createApiClient();
    // Await params in Next.js 15+
    const { id } = await params;
    
    console.log('GET vehicle ID:', id); // Debug log
    
    if (!id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Vehicle ID is required' 
      }, { status: 400 });
    }
    
    // Get current showroom ID
    const showroomId = await getCurrentShowroomId(supabase);
    
    const { data, error } = await supabase
      .from('vehicles')
      .select(`
        *,
        brand:brands (
          id,
          brand_name
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching vehicle:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Vehicle not found' 
      }, { status: 404 });
    }
    
    // If showroom context exists, verify the vehicle belongs to this showroom
    if (showroomId && data) {
      const belongsToShowroom = await vehicleBelongsToShowroom(supabase, id, showroomId);
      
      if (!belongsToShowroom) {
        return NextResponse.json({ 
          success: false, 
          error: 'Vehicle does not belong to your showroom' 
        }, { status: 403 });
      }
    }
    
    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error in vehicle detail API:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createApiClient();
    // Await params in Next.js 15+
    const { id } = await params;
    const body = await request.json();
    
    console.log('PUT vehicle ID:', id); // Debug log
    console.log('PUT request body:', body); // Debug log
    
    if (!id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Vehicle ID is required' 
      }, { status: 400 });
    }
    
    // Validate required fields
    if (!body.brand_id || !body.model_name || !body.vehicle_type) {
      return NextResponse.json({ 
        success: false, 
        error: 'Brand, model name, and vehicle type are required' 
      }, { status: 400 });
    }
    
    // Get current showroom ID
    const showroomId = await getCurrentShowroomId(supabase);
    
    // Check if vehicle exists
    const { data: existingVehicle, error: checkError } = await supabase
      .from('vehicles')
      .select('id, brand_id')
      .eq('id', id)
      .single();
    
    if (checkError) {
      console.error('Error checking vehicle existence:', checkError);
      return NextResponse.json({ 
        success: false, 
        error: 'Vehicle not found' 
      }, { status: 404 });
    }
    
    if (!existingVehicle) {
      return NextResponse.json({ 
        success: false, 
        error: 'Vehicle not found' 
      }, { status: 404 });
    }
    
    // If showroom context exists, verify the vehicle belongs to this showroom
    if (showroomId) {
      const belongsToShowroom = await vehicleBelongsToShowroom(supabase, id, showroomId);
      
      if (!belongsToShowroom) {
        return NextResponse.json({ 
          success: false, 
          error: 'Vehicle does not belong to your showroom' 
        }, { status: 403 });
      }
      
      // Also verify that the new brand_id belongs to this showroom
      if (body.brand_id !== existingVehicle.brand_id) {
        const { data: newBrandInShowroom } = await supabase
          .from('showroom_brands')
          .select('id')
          .eq('showroom_id', showroomId)
          .eq('brand_id', body.brand_id)
          .maybeSingle();
        
        if (!newBrandInShowroom) {
          return NextResponse.json({ 
            success: false, 
            error: 'New brand does not belong to your showroom' 
          }, { status: 403 });
        }
      }
    }
    
    // Check for duplicate model name within same brand (excluding current vehicle)
    const { data: duplicate, error: dupError } = await supabase
      .from('vehicles')
      .select('id')
      .eq('brand_id', body.brand_id)
      .eq('model_name', body.model_name)
      .neq('id', id)
      .maybeSingle();
    
    if (dupError) {
      console.error('Error checking duplicate:', dupError);
    }
    
    if (duplicate) {
      return NextResponse.json({ 
        success: false, 
        error: 'A vehicle with this model name already exists for this brand' 
      }, { status: 400 });
    }
    
    const vehicleData = {
      brand_id: body.brand_id,
      model_name: body.model_name,
      variant_name: body.variant_name || null,
      vehicle_type: body.vehicle_type,
      battery_capacity_kwh: body.battery_capacity_kwh || null,
      range_per_charge_km: body.range_per_charge_km || null,
      motor_power_kw: body.motor_power_kw || null,
      charging_time_standard_hrs: body.charging_time_standard_hrs || null,
      charging_time_fast_hrs: body.charging_time_fast_hrs || null,
      top_speed_kmph: body.top_speed_kmph || null,
      seating_capacity: body.seating_capacity || 2,
      ex_showroom_price: body.ex_showroom_price || null,
      insurance_amount: body.insurance_amount || null,
      rto_charges: body.rto_charges || null,
      vehicle_warranty_years: body.vehicle_warranty_years || 3,
      vehicle_warranty_km: body.vehicle_warranty_km || 125000,
      battery_warranty_years: body.battery_warranty_years || 5,
      battery_warranty_km: body.battery_warranty_km || 60000,
      is_active: body.is_active !== undefined ? body.is_active : true,
      is_discontinued: body.is_discontinued !== undefined ? body.is_discontinued : false,
      updated_at: new Date().toISOString(),
    };
    
    const { data, error } = await supabase
      .from('vehicles')
      .update(vehicleData)
      .eq('id', id)
      .select(`
        *,
        brand:brands (
          id,
          brand_name
        )
      `)
      .single();
    
    if (error) {
      console.error('Error updating vehicle:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message || 'Failed to update vehicle' 
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data,
      message: 'Vehicle updated successfully'
    });
  } catch (error) {
    console.error('Error in vehicle update API:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createApiClient();
    // Await params in Next.js 15+
    const { id } = await params;
    
    console.log('DELETE vehicle ID:', id); // Debug log
    
    if (!id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Vehicle ID is required' 
      }, { status: 400 });
    }
    
    // Get current showroom ID
    const showroomId = await getCurrentShowroomId(supabase);
    
    // Check if vehicle exists
    const { data: vehicle, error: checkError } = await supabase
      .from('vehicles')
      .select('id, model_name, brand_id')
      .eq('id', id)
      .single();
    
    if (checkError) {
      console.error('Error checking vehicle existence:', checkError);
      return NextResponse.json({ 
        success: false, 
        error: 'Vehicle not found' 
      }, { status: 404 });
    }
    
    if (!vehicle) {
      return NextResponse.json({ 
        success: false, 
        error: 'Vehicle not found' 
      }, { status: 404 });
    }
    
    // If showroom context exists, verify the vehicle belongs to this showroom
    if (showroomId) {
      const belongsToShowroom = await vehicleBelongsToShowroom(supabase, id, showroomId);
      
      if (!belongsToShowroom) {
        return NextResponse.json({ 
          success: false, 
          error: 'Vehicle does not belong to your showroom' 
        }, { status: 403 });
      }
    }
    
    // Check if vehicle is referenced in inventory
    const { count: inventoryCount, error: invError } = await supabase
      .from('inventory')
      .select('id', { count: 'exact', head: true })
      .eq('vehicle_model_id', id);
    
    if (invError) {
      console.error('Error checking inventory:', invError);
    }
    
    if (inventoryCount && inventoryCount > 0) {
      return NextResponse.json({ 
        success: false, 
        error: `Cannot delete vehicle. It is referenced in ${inventoryCount} inventory items. Remove inventory items first.` 
      }, { status: 400 });
    }
    
    // Check if vehicle is referenced in test ride bookings
    const { count: testRideCount, error: trError } = await supabase
      .from('test_ride_bookings')
      .select('id', { count: 'exact', head: true })
      .eq('vehicle_model_id', id);
    
    if (trError) {
      console.error('Error checking test rides:', trError);
    }
    
    if (testRideCount && testRideCount > 0) {
      return NextResponse.json({ 
        success: false, 
        error: `Cannot delete vehicle. It is referenced in ${testRideCount} test ride bookings. Remove bookings first.` 
      }, { status: 400 });
    }
    
    // Check if vehicle is referenced in sales invoices
    const { count: salesCount, error: salesError } = await supabase
      .from('sales_invoices')
      .select('id', { count: 'exact', head: true })
      .eq('vehicle_id', id);
    
    if (salesError) {
      console.error('Error checking sales invoices:', salesError);
    }
    
    if (salesCount && salesCount > 0) {
      return NextResponse.json({ 
        success: false, 
        error: `Cannot delete vehicle. It is referenced in ${salesCount} sales invoices.` 
      }, { status: 400 });
    }
    
    // Check if vehicle is referenced in customer vehicles
    const { count: custVehCount, error: cvError } = await supabase
      .from('customer_vehicles')
      .select('id', { count: 'exact', head: true })
      .eq('vehicle_model_id', id);
    
    if (cvError) {
      console.error('Error checking customer vehicles:', cvError);
    }
    
    if (custVehCount && custVehCount > 0) {
      return NextResponse.json({ 
        success: false, 
        error: `Cannot delete vehicle. It is referenced in ${custVehCount} customer vehicles.` 
      }, { status: 400 });
    }
    
    // Check if vehicle is referenced in service records
    const { count: serviceCount, error: serviceError } = await supabase
      .from('service_records')
      .select('id', { count: 'exact', head: true })
      .eq('vehicle_id', id);
    
    if (serviceError) {
      console.error('Error checking service records:', serviceError);
    }
    
    if (serviceCount && serviceCount > 0) {
      return NextResponse.json({ 
        success: false, 
        error: `Cannot delete vehicle. It is referenced in ${serviceCount} service records.` 
      }, { status: 400 });
    }
    
    // All checks passed, proceed with deletion
    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting vehicle:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message || 'Failed to delete vehicle' 
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: `Vehicle "${vehicle.model_name}" deleted successfully`
    });
  } catch (error) {
    console.error('Error in vehicle delete API:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}