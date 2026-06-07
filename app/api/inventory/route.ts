// app/api/inventory/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper function to handle empty date strings
const getDateOrNull = (dateStr: string | null | undefined): string | null => {
  if (!dateStr || dateStr === '') return null;
  return dateStr;
};

// GET - Fetch inventory with filters, search, and pagination
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const showroomId = request.cookies.get('showroom_id')?.value;
    
    console.log('🔍 GET - Cookie showroom_id:', showroomId);
    
    if (!showroomId) {
      return NextResponse.json(
        { error: 'No showroom selected. Please login again.' },
        { status: 401 }
      );
    }

    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const search = (searchParams.get('search') || '').trim();
    const stockStatus = searchParams.get('stock_status') || '';
    const brandId = searchParams.get('brand_id') || '';
    const vehicleType = searchParams.get('vehicle_type') || '';
    const isTestRide = searchParams.get('is_test_ride_vehicle');
    const isDemo = searchParams.get('is_demo_vehicle');
    const sortBy = searchParams.get('sort_by') || 'created_at';
    const sortOrder = (searchParams.get('sort_order') || 'desc') as 'asc' | 'desc';

    let query = supabase
      .from('inventory')
      .select(`
        id,
        showroom_id,
        vehicle_model_id,
        sold_to_customer_id,
        sale_invoice_id,
        vin_number,
        chassis_number,
        motor_number,
        battery_number,
        color,
        variant_name,
        received_date,
        received_from,
        manufacturing_date,
        invoice_date,
        purchase_cost,
        ex_showroom_price,
        on_road_price,
        current_selling_price,
        battery_charge_percentage,
        battery_health_status,
        last_charge_date,
        software_version,
        firmware_version,
        stock_status,
        location_in_showroom,
        is_test_ride_vehicle,
        test_ride_count,
        is_demo_vehicle,
        sold_date,
        created_at,
        updated_at,
        vehicles:vehicle_model_id(
          id,
          model_name,
          variant_name,
          vehicle_type,
          ex_showroom_price,
          insurance_amount,
          rto_charges,
          battery_capacity_kwh,
          range_per_charge_km,
          motor_power_kw,
          brand_id,
          brands:brand_id(
            id,
            brand_name
          )
        ),
        customers:sold_to_customer_id(
          id,
          first_name,
          last_name,
          mobile
        ),
        sales_invoices:sale_invoice_id(
          id,
          invoice_number
        )
      `, { count: 'exact' })
      .eq('showroom_id', showroomId);

    if (search) {
      const searchTerm = `%${search}%`;
      query = query.or(
        `vin_number.ilike.${searchTerm},chassis_number.ilike.${searchTerm},motor_number.ilike.${searchTerm},battery_number.ilike.${searchTerm}`
      );
    }
    if (stockStatus) query = query.eq('stock_status', stockStatus);
    if (vehicleType) query = query.eq('vehicles.vehicle_type', vehicleType);
    if (isTestRide && isTestRide !== 'undefined' && isTestRide !== '') {
      query = query.eq('is_test_ride_vehicle', isTestRide === 'true');
    }
    if (isDemo && isDemo !== 'undefined' && isDemo !== '') {
      query = query.eq('is_demo_vehicle', isDemo === 'true');
    }
    if (brandId) query = query.eq('vehicles.brand_id', brandId);

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(from, to);

    if (error) {
      console.error('❌ GET - Query error:', error);
      throw error;
    }

    return NextResponse.json({
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error: any) {
    console.error('❌ GET - API Error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to fetch inventory',
        details: process.env.NODE_ENV === 'development' ? {
          message: error.message,
          hint: error.hint,
          details: error.details,
          code: error.code
        } : undefined
      },
      { status: 500 }
    );
  }
}

// POST - Add new inventory item
export async function POST(request: NextRequest) {
  try {
    const showroomId = request.cookies.get('showroom_id')?.value;
    
    if (!showroomId) {
      return NextResponse.json(
        { error: 'No showroom selected. Please login again.' },
        { status: 401 }
      );
    }

    const body = await request.json();

    const errors: string[] = [];
    if (!body.vehicle_model_id) errors.push('Vehicle model is required');
    if (!body.vin_number) errors.push('VIN number is required');
    if (!body.chassis_number) errors.push('Chassis number is required');
    if (!body.motor_number) errors.push('Motor number is required');
    if (!body.battery_number) errors.push('Battery number is required');
    if (!body.received_date) errors.push('Received date is required');

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(', ') }, { status: 400 });
    }

    const { data: existingVin } = await supabase
      .from('inventory')
      .select('id, vin_number')
      .eq('vin_number', body.vin_number.trim())
      .maybeSingle();

    if (existingVin) {
      return NextResponse.json(
        { error: `Vehicle with VIN "${body.vin_number}" already exists` },
        { status: 409 }
      );
    }

    const { data: existingChassis } = await supabase
      .from('inventory')
      .select('id, chassis_number')
      .eq('chassis_number', body.chassis_number.trim())
      .maybeSingle();

    if (existingChassis) {
      return NextResponse.json(
        { error: `Vehicle with Chassis "${body.chassis_number}" already exists` },
        { status: 409 }
      );
    }

    const insertData = {
      showroom_id: showroomId,
      vehicle_model_id: body.vehicle_model_id,
      vin_number: body.vin_number.trim(),
      chassis_number: body.chassis_number.trim(),
      motor_number: body.motor_number.trim(),
      battery_number: body.battery_number.trim(),
      color: body.color || null,
      variant_name: body.variant_name || null,
      received_date: body.received_date,
      received_from: body.received_from || null,
      manufacturing_date: getDateOrNull(body.manufacturing_date),
      purchase_cost: body.purchase_cost || 0,
      ex_showroom_price: body.ex_showroom_price || 0,
      on_road_price: body.on_road_price || 0,
      current_selling_price: body.current_selling_price || 0,
      battery_charge_percentage: body.battery_charge_percentage ?? 50,
      battery_health_status: body.battery_health_status || 'Good',
      software_version: body.software_version || null,
      firmware_version: body.firmware_version || null,
      stock_status: body.stock_status || 'Available',
      location_in_showroom: body.location_in_showroom || null,
      is_test_ride_vehicle: body.is_test_ride_vehicle || false,
      is_demo_vehicle: body.is_demo_vehicle || false
    };

    const { data, error } = await supabase
      .from('inventory')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('❌ POST - Insert error:', error);
      throw error;
    }

    return NextResponse.json({ 
      data, 
      message: 'Inventory item added successfully' 
    }, { status: 201 });

  } catch (error: any) {
    console.error('❌ POST - API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create inventory item' },
      { status: 500 }
    );
  }
}

// PUT - Update inventory item
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Inventory ID is required' }, { status: 400 });
    }

    const allowedFields = [
      'vehicle_model_id', 'sold_to_customer_id', 'sale_invoice_id',
      'vin_number', 'chassis_number', 'motor_number', 'battery_number',
      'color', 'variant_name', 'received_date', 'received_from',
      'manufacturing_date', 'invoice_date', 'purchase_cost',
      'ex_showroom_price', 'on_road_price', 'current_selling_price',
      'battery_charge_percentage', 'battery_health_status', 'last_charge_date',
      'software_version', 'firmware_version', 'stock_status',
      'location_in_showroom', 'is_test_ride_vehicle', 'test_ride_count',
      'is_demo_vehicle', 'sold_date'
    ];

    const dateFields = ['received_date', 'manufacturing_date', 'invoice_date', 'last_charge_date', 'sold_date'];
    const cleanUpdates: any = {};
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        if (dateFields.includes(field) && updates[field] === '') {
          cleanUpdates[field] = null;
        } else {
          cleanUpdates[field] = updates[field];
        }
      }
    }

    if (cleanUpdates.stock_status === 'Sold' && !cleanUpdates.sold_date) {
      cleanUpdates.sold_date = new Date().toISOString().split('T')[0];
    }
    
    if (cleanUpdates.stock_status && 
        cleanUpdates.stock_status !== 'Sold' && 
        cleanUpdates.stock_status !== 'Booked') {
      cleanUpdates.sold_date = null;
      cleanUpdates.sold_to_customer_id = null;
      cleanUpdates.sale_invoice_id = null;
    }
    
    cleanUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('inventory')
      .update(cleanUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ PUT - Update error:', error);
      throw error;
    }

    return NextResponse.json({ 
      data, 
      message: 'Inventory updated successfully' 
    });

  } catch (error: any) {
    console.error('❌ PUT - API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update inventory' },
      { status: 500 }
    );
  }
}

// PATCH - Bulk update stock status
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids, stock_status, location_in_showroom } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'IDs array is required' }, { status: 400 });
    }

    if (!stock_status) {
      return NextResponse.json({ error: 'Stock status is required' }, { status: 400 });
    }

    const updates: any = {
      stock_status,
      updated_at: new Date().toISOString()
    };
    
    if (location_in_showroom !== undefined) {
      updates.location_in_showroom = location_in_showroom;
    }

    if (stock_status === 'Sold') {
      updates.sold_date = new Date().toISOString().split('T')[0];
    } else if (stock_status !== 'Booked') {
      updates.sold_date = null;
      updates.sold_to_customer_id = null;
      updates.sale_invoice_id = null;
    }

    const { data, error } = await supabase
      .from('inventory')
      .update(updates)
      .in('id', ids)
      .select();

    if (error) {
      console.error('❌ PATCH - Bulk update error:', error);
      throw error;
    }

    return NextResponse.json({
      data,
      message: `${ids.length} inventory items updated successfully`
    });

  } catch (error: any) {
    console.error('❌ PATCH - API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update inventory' },
      { status: 500 }
    );
  }
}

// DELETE - Remove inventory item
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Inventory ID is required' }, { status: 400 });
    }

    const { data: inventory, error: fetchError } = await supabase
      .from('inventory')
      .select('id, stock_status, vin_number')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
      }
      throw fetchError;
    }

    if (!inventory) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
    }

    if (inventory.stock_status === 'Sold') {
      return NextResponse.json(
        { error: 'Cannot delete sold vehicles' },
        { status: 400 }
      );
    }

    if (inventory.stock_status === 'Booked') {
      return NextResponse.json(
        { error: 'Cannot delete booked vehicles. Cancel booking first.' },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase
      .from('inventory')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('❌ DELETE - Delete error:', deleteError);
      throw deleteError;
    }

    return NextResponse.json({ 
      message: 'Inventory item deleted successfully',
      deletedVin: inventory.vin_number
    });

  } catch (error: any) {
    console.error('❌ DELETE - API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete inventory' },
      { status: 500 }
    );
  }
}