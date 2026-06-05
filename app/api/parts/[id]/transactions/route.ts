// app/api/parts/[id]/transactions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createApiClient } from '@/lib/supabase/api-client';

function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createApiClient();
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    
    if (!id || !isValidUUID(id)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid part ID format' 
      }, { status: 400 });
    }
    
    const showroomId = request.cookies.get('showroom_id')?.value;
    
    // Verify part belongs to showroom
    const { data: part } = await supabase
      .from('parts')
      .select('id')
      .eq('id', id)
      .eq('showroom_id', showroomId || '')
      .single();
    
    if (!part) {
      return NextResponse.json({ 
        success: false, 
        error: 'Part not found' 
      }, { status: 404 });
    }
    
    const { data, error } = await supabase
      .from('parts_transactions')
      .select(`
        *,
        performed_by_user:showroom_users(full_name)
      `)
      .eq('part_id', id)
      .order('transaction_date', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching transactions:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch transactions' 
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('Error in transactions GET API:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createApiClient();
    const { id } = await params;
    const body = await request.json();
    
    console.log('POST transaction for part ID:', id);
    console.log('Request body:', JSON.stringify(body, null, 2));
    
    if (!id || !isValidUUID(id)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid part ID format' 
      }, { status: 400 });
    }
    
    // Get IDs from cookies
    const showroomId = request.cookies.get('showroom_id')?.value;
    const userId = request.cookies.get('user_id')?.value;
    
    console.log('Showroom ID:', showroomId);
    console.log('User ID:', userId);
    
    if (!showroomId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Showroom ID not found in cookies. Please log in again.' 
      }, { status: 400 });
    }
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'User ID not found in cookies. Please log in again.' 
      }, { status: 400 });
    }
    
    // Validate required fields
    if (!body.transaction_type || body.quantity === undefined || body.quantity === null) {
      return NextResponse.json({ 
        success: false, 
        error: 'Transaction type and quantity are required' 
      }, { status: 400 });
    }
    
    const quantity = parseInt(body.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Quantity must be a positive number' 
      }, { status: 400 });
    }
    
    // Get current stock record
    const { data: stock, error: stockError } = await supabase
      .from('parts_stock')
      .select('*')
      .eq('part_id', id)
      .eq('showroom_id', showroomId)
      .single();
    
    if (stockError || !stock) {
      console.error('Stock record error:', stockError);
      return NextResponse.json({ 
        success: false, 
        error: 'Stock record not found for this part' 
      }, { status: 404 });
    }
    
    console.log('Current stock:', JSON.stringify(stock, null, 2));
    
    // Determine if this is an addition or removal
    const additionTypes = ['Purchase', 'Stock_Adjustment_Add', 'Customer_Return', 'Transfer_In'];
    const removalTypes = ['Service_Used', 'Counter_Sale', 'Return_to_Supplier', 'Stock_Adjustment_Remove', 'Transfer_Out', 'Damaged_WriteOff'];
    
    const isAddition = additionTypes.includes(body.transaction_type);
    const isRemoval = removalTypes.includes(body.transaction_type);
    
    if (!isAddition && !isRemoval) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid transaction type: ' + body.transaction_type 
      }, { status: 400 });
    }
    
    // Calculate current available stock (quantity_available is a generated column)
    const currentAvailable = (stock.quantity_on_hand || 0) - (stock.quantity_allocated || 0);
    
    // Check if enough stock for removal
    if (isRemoval && quantity > currentAvailable) {
      return NextResponse.json({ 
        success: false, 
        error: `Insufficient stock. Available: ${currentAvailable}, Requested: ${quantity}` 
      }, { status: 400 });
    }
    
    // Calculate new stock levels
    const quantityChange = isAddition ? quantity : -quantity;
    const newQuantityOnHand = (stock.quantity_on_hand || 0) + quantityChange;
    // NOTE: quantity_available is auto-generated from (quantity_on_hand - quantity_allocated)
    
    // Calculate costs
    const unitCost = body.unit_cost !== undefined && body.unit_cost !== null && body.unit_cost !== '' 
      ? parseFloat(body.unit_cost) 
      : (stock.average_cost || 0);
    const totalAmount = unitCost ? unitCost * quantity : null;
    
    // Calculate new average cost for additions
    let newAverageCost = stock.average_cost || 0;
    if (isAddition && unitCost && newQuantityOnHand > 0) {
      newAverageCost = ((stock.average_cost || 0) * (stock.quantity_on_hand || 0) + unitCost * quantity) / newQuantityOnHand;
    }
    
    // Create transaction record
    const transactionData = {
      showroom_id: showroomId,
      part_id: id,
      transaction_type: body.transaction_type,
      quantity: quantity,
      unit_cost: unitCost,
      total_amount: totalAmount,
      reference_type: body.reference_type || null,
      reference_id: body.reference_id || null,
      service_record_id: body.service_record_id || null,
      customer_id: body.customer_id || null,
      notes: body.notes || null,
      performed_by: userId,
      transaction_date: new Date().toISOString(),
    };
    
    console.log('Transaction data:', JSON.stringify(transactionData, null, 2));
    
    const { data: transaction, error: transError } = await supabase
      .from('parts_transactions')
      .insert(transactionData)
      .select()
      .single();
    
    if (transError) {
      console.error('Error creating transaction:', transError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to create transaction: ' + transError.message 
      }, { status: 500 });
    }
    
    console.log('Transaction created:', transaction.id);
    
    // Update stock - ONLY update quantity_on_hand (quantity_available is a GENERATED column)
    const stockUpdateData = {
      quantity_on_hand: newQuantityOnHand,
      average_cost: Math.round(newAverageCost * 100) / 100, // Round to 2 decimal places
      last_purchase_cost: isAddition ? unitCost : stock.last_purchase_cost,
      updated_at: new Date().toISOString(),
    };
    
    console.log('Stock update data:', JSON.stringify(stockUpdateData, null, 2));
    
    const { error: updateError } = await supabase
      .from('parts_stock')
      .update(stockUpdateData)
      .eq('part_id', id)
      .eq('showroom_id', showroomId);
    
    if (updateError) {
      console.error('Error updating stock:', updateError);
      return NextResponse.json({ 
        success: false, 
        error: 'Transaction created but stock update failed: ' + updateError.message 
      }, { status: 500 });
    }
    
    // Read back updated stock to get the generated quantity_available
    const { data: updatedStock } = await supabase
      .from('parts_stock')
      .select('quantity_on_hand, quantity_allocated, quantity_available, average_cost')
      .eq('part_id', id)
      .single();
    
    const newAvailable = updatedStock?.quantity_available ?? (newQuantityOnHand - (stock.quantity_allocated || 0));
    
    console.log('Stock updated successfully. New available:', newAvailable);
    
    return NextResponse.json({
      success: true,
      data: transaction,
      message: `Stock ${isAddition ? 'added' : 'removed'} successfully. New available quantity: ${newAvailable}`,
      stockUpdate: {
        previous_on_hand: stock.quantity_on_hand,
        new_on_hand: newQuantityOnHand,
        previous_available: currentAvailable,
        new_available: newAvailable,
        quantity_change: quantityChange,
      }
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error in transaction create API:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 });
  }
}