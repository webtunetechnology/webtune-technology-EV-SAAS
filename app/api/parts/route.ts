// app/api/parts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createApiClient } from '@/lib/supabase/api-client';

// UUID validation helper
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Helper to flatten current_stock from array to object
function flattenPartStock(part: any) {
  return {
    ...part,
    current_stock: Array.isArray(part.current_stock) ? part.current_stock[0] || null : part.current_stock
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createApiClient();
    const searchParams = request.nextUrl.searchParams;
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const is_active = searchParams.get('is_active') || '';
    const stock_status = searchParams.get('stock_status') || '';
    const supplier_name = searchParams.get('supplier_name') || '';
    
    const showroom_id = request.cookies.get('showroom_id')?.value;
    
    if (!showroom_id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Showroom ID not found in cookies' 
      }, { status: 400 });
    }
    
    console.log('Using showroom_id from cookie:', showroom_id);
    
    let query = supabase
      .from('parts')
      .select(`
        *,
        current_stock:parts_stock(*)
      `, { count: 'exact' })
      .eq('showroom_id', showroom_id);
    
    if (search) {
      query = query.or(
        `part_name.ilike.%${search}%,part_code.ilike.%${search}%,manufacturer.ilike.%${search}%,supplier_name.ilike.%${search}%`
      );
    }
    
    if (category) {
      query = query.eq('category', category);
    }
    
    if (is_active === 'true') {
      query = query.eq('is_active', true);
    } else if (is_active === 'false') {
      query = query.eq('is_active', false);
    }
    
    if (supplier_name) {
      query = query.ilike('supplier_name', `%${supplier_name}%`);
    }
    
    const { data: allParts, error: fetchError } = await query
      .order('part_name', { ascending: true });
    
    if (fetchError) {
      console.error('Error fetching parts:', fetchError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch parts' 
      }, { status: 500 });
    }
    
    // Flatten all parts first
    let filteredParts = (allParts || []).map(flattenPartStock);
    
    // Apply stock status filter
    if (stock_status) {
      filteredParts = filteredParts.filter(part => {
        const stock = part.current_stock;
        const available = stock?.quantity_available ?? 0;
        const reorderPoint = part.reorder_point || 0;
        
        switch (stock_status) {
          case 'out_of_stock':
            return available <= 0;
          case 'low_stock':
            return available > 0 && available <= reorderPoint;
          case 'reorder':
            return available > 0 && available <= reorderPoint;
          case 'in_stock':
            return available > reorderPoint;
          default:
            return true;
        }
      });
    }
    
    const total = filteredParts.length;
    const offset = (page - 1) * limit;
    const paginatedParts = filteredParts.slice(offset, offset + limit);
    
    return NextResponse.json({
      success: true,
      data: paginatedParts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error in parts API:', error);
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
    const showroom_id = request.cookies.get('showroom_id')?.value;
    
    if (!showroom_id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Showroom ID not found in cookies' 
      }, { status: 400 });
    }
    
    console.log('Creating part for showroom:', showroom_id);
    console.log('Request body:', JSON.stringify(body, null, 2));
    
    if (!body.part_name || !body.category) {
      return NextResponse.json({ 
        success: false, 
        error: 'Part name and category are required' 
      }, { status: 400 });
    }
    
    let partCode = body.part_code;
    if (!partCode) {
      const { count } = await supabase
        .from('parts')
        .select('*', { count: 'exact', head: true })
        .eq('showroom_id', showroom_id);
      
      partCode = `PRT-${String((count || 0) + 1).padStart(5, '0')}`;
    }
    
    const { data: existing } = await supabase
      .from('parts')
      .select('id')
      .eq('part_code', partCode)
      .eq('showroom_id', showroom_id)
      .maybeSingle();
    
    if (existing) {
      return NextResponse.json({ 
        success: false, 
        error: 'A part with this code already exists' 
      }, { status: 400 });
    }
    
    // Handle compatible_vehicle_models - ensure only valid UUIDs
    let compatibleVehicleModels: string[] = [];
    if (body.compatible_vehicle_models && Array.isArray(body.compatible_vehicle_models)) {
      compatibleVehicleModels = body.compatible_vehicle_models.filter((id: any) => 
        typeof id === 'string' && isValidUUID(id)
      );
    }
    
    const sellingPrice = body.selling_price !== undefined && body.selling_price !== '' 
      ? parseFloat(body.selling_price) 
      : null;
    const mrp = body.mrp !== undefined && body.mrp !== '' 
      ? parseFloat(body.mrp) 
      : null;
    
    const partData = {
      showroom_id,
      part_code: partCode,
      part_name: body.part_name.trim(),
      description: body.description || null,
      category: body.category,
      sub_category: body.sub_category || null,
      unit_of_measure: body.unit_of_measure || 'Piece',
      manufacturer: body.manufacturer || null,
      supplier_name: body.supplier_name || null,
      supplier_part_code: body.supplier_part_code || null,
      compatible_vehicle_models: compatibleVehicleModels,
      hsn_code: body.hsn_code || null,
      gst_percentage: parseFloat(body.gst_percentage) || 18,
      min_stock_level: parseInt(body.min_stock_level) || 5,
      max_stock_level: parseInt(body.max_stock_level) || 100,
      reorder_point: parseInt(body.reorder_point) || 10,
      lead_time_days: body.lead_time_days ? parseInt(body.lead_time_days) : null,
      is_active: body.is_active !== undefined ? body.is_active : true,
      is_consumable: body.is_consumable || false,
      warranty_months: body.warranty_months ? parseInt(body.warranty_months) : null,
    };
    
    console.log('Part data to insert:', JSON.stringify(partData, null, 2));
    
    const { data: part, error: partError } = await supabase
      .from('parts')
      .insert(partData)
      .select()
      .single();
    
    if (partError) {
      console.error('Error creating part:', partError);
      return NextResponse.json({ 
        success: false, 
        error: partError.message || 'Failed to create part'
      }, { status: 500 });
    }
    
    // Create initial stock record with prices
    const stockData = {
      showroom_id,
      part_id: part.id,
      quantity_on_hand: 0,
      quantity_allocated: 0,
      location_in_store: body.location_in_store || null,
      bin_number: body.bin_number || null,
      rack_number: body.rack_number || null,
      selling_price: sellingPrice,
      mrp: mrp,
      average_cost: 0,
      last_purchase_cost: null,
    };
    
    console.log('Stock data to insert:', JSON.stringify(stockData, null, 2));
    
    const { data: stock, error: stockError } = await supabase
      .from('parts_stock')
      .insert(stockData)
      .select()
      .single();
    
    if (stockError) {
      console.error('Error creating stock record:', stockError);
      await supabase.from('parts').delete().eq('id', part.id);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to create stock record: ' + stockError.message
      }, { status: 500 });
    }
    
    // Return part with stock as object (not array)
    const result = {
      ...part,
      current_stock: stock
    };
    
    return NextResponse.json({
      success: true,
      data: result,
      message: 'Part created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error in part create API:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}