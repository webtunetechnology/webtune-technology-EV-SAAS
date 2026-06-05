// app/api/parts/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createApiClient } from '@/lib/supabase/api-client';

function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

function flattenPartStock(part: any) {
  return {
    ...part,
    current_stock: Array.isArray(part.current_stock) ? part.current_stock[0] || null : part.current_stock
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createApiClient();
    const { id } = await params;
    
    console.log('GET part ID:', id);
    
    if (!id || !isValidUUID(id)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid part ID format' 
      }, { status: 400 });
    }
    
    const { data, error } = await supabase
      .from('parts')
      .select(`
        *,
        current_stock:parts_stock(*)
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching part:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Part not found' 
      }, { status: 404 });
    }
    
    // Flatten current_stock from array to object
    const result = flattenPartStock(data);
    
    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error in part detail API:', error);
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
    const { id } = await params;
    const body = await request.json();
    
    console.log('PUT part ID:', id);
    console.log('PUT body:', JSON.stringify(body, null, 2));
    
    if (!id || !isValidUUID(id)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid part ID format' 
      }, { status: 400 });
    }
    
    if (!body.part_name || !body.category) {
      return NextResponse.json({ 
        success: false, 
        error: 'Part name and category are required' 
      }, { status: 400 });
    }
    
    const showroomId = request.cookies.get('showroom_id')?.value;
    
    const { data: existingPart, error: checkError } = await supabase
      .from('parts')
      .select('id, showroom_id, part_code')
      .eq('id', id)
      .single();
    
    if (checkError || !existingPart) {
      console.error('Part not found for update:', checkError);
      return NextResponse.json({ 
        success: false, 
        error: 'Part not found' 
      }, { status: 404 });
    }
    
    if (showroomId && existingPart.showroom_id !== showroomId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Part does not belong to your showroom' 
      }, { status: 403 });
    }
    
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
      part_code: body.part_code || existingPart.part_code,
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
      updated_at: new Date().toISOString(),
    };
    
    console.log('Part data to update:', JSON.stringify(partData, null, 2));
    
    const { error: partError } = await supabase
      .from('parts')
      .update(partData)
      .eq('id', id);
    
    if (partError) {
      console.error('Error updating part:', partError);
      return NextResponse.json({ 
        success: false, 
        error: partError.message || 'Failed to update part'
      }, { status: 500 });
    }
    
    // Check if stock record exists
    const { data: existingStock } = await supabase
      .from('parts_stock')
      .select('id')
      .eq('part_id', id)
      .maybeSingle();
    
    const stockData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    
    if (body.location_in_store !== undefined) stockData.location_in_store = body.location_in_store || null;
    if (body.bin_number !== undefined) stockData.bin_number = body.bin_number || null;
    if (body.rack_number !== undefined) stockData.rack_number = body.rack_number || null;
    if (body.selling_price !== undefined) stockData.selling_price = sellingPrice;
    if (body.mrp !== undefined) stockData.mrp = mrp;
    
    console.log('Stock data to update:', JSON.stringify(stockData, null, 2));
    
    if (existingStock) {
      const { error: stockError } = await supabase
        .from('parts_stock')
        .update(stockData)
        .eq('part_id', id);
      
      if (stockError) {
        console.error('Error updating stock:', stockError);
      }
    } else {
      const { error: stockError } = await supabase
        .from('parts_stock')
        .insert({
          showroom_id: showroomId || existingPart.showroom_id,
          part_id: id,
          quantity_on_hand: 0,
          quantity_allocated: 0,
          location_in_store: body.location_in_store || null,
          bin_number: body.bin_number || null,
          rack_number: body.rack_number || null,
          selling_price: sellingPrice,
          mrp: mrp,
          average_cost: 0,
        });
      
      if (stockError) {
        console.error('Error creating stock record:', stockError);
      }
    }
    
    // Fetch updated part with stock
    const { data: updatedPart, error: fetchError } = await supabase
      .from('parts')
      .select('*, current_stock:parts_stock(*)')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      console.error('Error fetching updated part:', fetchError);
    }
    
    // Flatten current_stock
    const result = updatedPart ? flattenPartStock(updatedPart) : null;
    
    console.log('Updated part result:', JSON.stringify(result, null, 2));
    
    return NextResponse.json({
      success: true,
      data: result,
      message: 'Part updated successfully'
    });
  } catch (error) {
    console.error('Error in part update API:', error);
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
    const { id } = await params;
    
    console.log('DELETE part ID:', id);
    
    if (!id || !isValidUUID(id)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid part ID format' 
      }, { status: 400 });
    }
    
    const showroomId = request.cookies.get('showroom_id')?.value;
    
    const { data: part, error: checkError } = await supabase
      .from('parts')
      .select('id, part_name, showroom_id')
      .eq('id', id)
      .single();
    
    if (checkError || !part) {
      console.error('Part not found for delete:', checkError);
      return NextResponse.json({ 
        success: false, 
        error: 'Part not found' 
      }, { status: 404 });
    }
    
    if (showroomId && part.showroom_id !== showroomId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Part does not belong to your showroom' 
      }, { status: 403 });
    }
    
    const { count: transCount } = await supabase
      .from('parts_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('part_id', id);
    
    const { count: poCount } = await supabase
      .from('parts_purchase_order_items')
      .select('id', { count: 'exact', head: true })
      .eq('part_id', id);
    
    const { count: csCount } = await supabase
      .from('parts_counter_sale_items')
      .select('id', { count: 'exact', head: true })
      .eq('part_id', id);
    
    const hasReferences = (transCount || 0) > 0 || (poCount || 0) > 0 || (csCount || 0) > 0;
    
    if (hasReferences) {
      const { error: updateError } = await supabase
        .from('parts')
        .update({ 
          is_active: false, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', id);
      
      if (updateError) {
        console.error('Error deactivating part:', updateError);
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to deactivate part' 
        }, { status: 500 });
      }
      
      return NextResponse.json({
        success: true,
        message: `Part "${part.part_name}" has existing references. Marked as inactive instead of deleting.`
      });
    }
    
    await supabase.from('parts_stock').delete().eq('part_id', id);
    await supabase.from('parts_counter_sale_items').delete().eq('part_id', id);
    await supabase.from('parts_purchase_order_items').delete().eq('part_id', id);
    await supabase.from('parts_transactions').delete().eq('part_id', id);
    
    const { error: deleteError } = await supabase
      .from('parts')
      .delete()
      .eq('id', id);
    
    if (deleteError) {
      console.error('Error deleting part:', deleteError);
      return NextResponse.json({ 
        success: false, 
        error: deleteError.message || 'Failed to delete part' 
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: `Part "${part.part_name}" deleted successfully`
    });
  } catch (error) {
    console.error('Error in part delete API:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}