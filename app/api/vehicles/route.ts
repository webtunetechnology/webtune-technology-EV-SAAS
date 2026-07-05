// app/api/vehicles/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createApiClient } from '@/lib/supabase/api-client';

function getShowroomIdFromCookies(request: NextRequest): string | null {
  return request.cookies.get('showroom_id')?.value || null;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createApiClient();
    const searchParams = request.nextUrl.searchParams;
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const vehicle_type = searchParams.get('vehicle_type') || '';
    const brand_id = searchParams.get('brand_id') || '';
    const is_active = searchParams.get('is_active') || '';
    const is_discontinued = searchParams.get('is_discontinued') || '';
    
    const offset = (page - 1) * limit;
    
    // Get showroom ID from cookies
    const showroomId = getShowroomIdFromCookies(request);
    
    let brandIds: string[] = [];
    
    if (showroomId) {
      console.log('Showroom ID from cookie:', showroomId);
      
      // Get the brand IDs associated with this showroom
      const { data: showroomBrands, error: brandError } = await supabase
        .from('showroom_brands')
        .select('brand_id')
        .eq('showroom_id', showroomId);
      
      if (brandError) {
        console.error('Error fetching showroom brands:', brandError);
      } else {
        brandIds = showroomBrands?.map(sb => sb.brand_id) || [];
        console.log('Brand IDs for showroom:', brandIds);
      }
    }
    
    // Build the base query
    let query = supabase
      .from('vehicles')
      .select(`
        *,
        brand:brands (
          id,
          brand_name
        )
      `, { count: 'exact' });
    
    // Only filter by brand if we have brand IDs
    if (brandIds.length > 0) {
      query = query.in('brand_id', brandIds);
    } else if (showroomId) {
      // If showroom exists but has no brands, return empty
      console.log('Showroom has no brands associated');
      return NextResponse.json({
        success: true,
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
        message: 'No brands are associated with this showroom. Add brands to see vehicles.'
      });
    }
    
    // Apply search filter
    if (search) {
      query = query.or(`model_name.ilike.%${search}%,variant_name.ilike.%${search}%`);
    }
    
    // Apply type filter
    if (vehicle_type) {
      query = query.eq('vehicle_type', vehicle_type);
    }
    
    // Apply brand filter
    if (brand_id) {
      query = query.eq('brand_id', brand_id);
    }
    
    // Apply active filter
    if (is_active === 'true') {
      query = query.eq('is_active', true);
    } else if (is_active === 'false') {
      query = query.eq('is_active', false);
    }
    
    // Apply discontinued filter
    if (is_discontinued === 'true') {
      query = query.eq('is_discontinued', true);
    } else if (is_discontinued === 'false') {
      query = query.eq('is_discontinued', false);
    }
    
    // Order and paginate
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('Error fetching vehicles:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch vehicles: ' + error.message 
      }, { status: 500 });
    }
    
    console.log(`Found ${count} vehicles total, returning ${data?.length || 0} for page ${page}`);
    
    return NextResponse.json({
      success: true,
      data: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    });
  } catch (error) {
    console.error('Error in vehicles API:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createApiClient();
    const body = await request.json();
    
    // Validate required fields
    if (!body.brand_id || !body.model_name || !body.vehicle_type) {
      return NextResponse.json({ 
        success: false, 
        error: 'Brand, model name, and vehicle type are required' 
      }, { status: 400 });
    }
    
    // Get showroom ID from cookies
    const showroomId = getShowroomIdFromCookies(request);
    
    // If showroom ID exists, verify brand belongs to showroom
    if (showroomId) {
      const { data: showroomBrand, error: sbError } = await supabase
        .from('showroom_brands')
        .select('id')
        .eq('showroom_id', showroomId)
        .eq('brand_id', body.brand_id)
        .maybeSingle();
      
      if (sbError || !showroomBrand) {
        // Auto-add the brand to the showroom if not already associated
        const { error: insertError } = await supabase
          .from('showroom_brands')
          .insert({
            showroom_id: showroomId,
            brand_id: body.brand_id
          });
        
        if (insertError) {
          console.error('Error adding brand to showroom:', insertError);
          return NextResponse.json({ 
            success: false, 
            error: 'Selected brand does not belong to your showroom and could not be added automatically.' 
          }, { status: 403 });
        }
        
        console.log('Automatically added brand to showroom');
      }
    }
    
    // Check if brand exists
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('id')
      .eq('id', body.brand_id)
      .single();
    
    if (brandError || !brand) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid brand selected' 
      }, { status: 400 });
    }
    
    // Check for duplicate model + variant combination within same brand
    const variantValue = body.variant_name?.trim() || null;
    let dupQuery = supabase
      .from('vehicles')
      .select('id')
      .eq('brand_id', body.brand_id)
      .eq('model_name', body.model_name);
    dupQuery = variantValue
      ? dupQuery.eq('variant_name', variantValue)
      : dupQuery.is('variant_name', null);
    const { data: existing } = await dupQuery.maybeSingle();

    if (existing) {
      return NextResponse.json({
        success: false,
        error: variantValue
          ? `A vehicle with model "${body.model_name}" and variant "${variantValue}" already exists for this brand`
          : `A vehicle with model "${body.model_name}" (no variant) already exists for this brand. Please add a variant name to differentiate.`,
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
      vehicle_warranty_years: body.vehicle_warranty_years ?? null,
      vehicle_warranty_km: body.vehicle_warranty_km ?? null,
      battery_warranty_years: body.battery_warranty_years ?? null,
      battery_warranty_km: body.battery_warranty_km ?? null,
      is_active: body.is_active !== undefined ? body.is_active : true,
      is_discontinued: body.is_discontinued !== undefined ? body.is_discontinued : false,
    };
    
    const { data, error } = await supabase
      .from('vehicles')
      .insert(vehicleData)
      .select(`
        *,
        brand:brands (
          id,
          brand_name
        )
      `)
      .single();
    
    if (error) {
      console.error('Error creating vehicle:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message || 'Failed to create vehicle' 
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data,
      message: 'Vehicle created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error in vehicle create API:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
