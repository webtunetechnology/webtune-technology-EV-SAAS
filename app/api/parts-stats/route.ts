// app/api/parts-stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createApiClient } from '@/lib/supabase/api-client';

function flattenPartStock(part: any) {
  return {
    ...part,
    current_stock: Array.isArray(part.current_stock) ? part.current_stock[0] || null : part.current_stock
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createApiClient();
    const showroomId = request.cookies.get('showroom_id')?.value;
    
    if (!showroomId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Showroom ID not found in cookies' 
      }, { status: 400 });
    }
    
    const { data: parts, error } = await supabase
      .from('parts')
      .select(`
        *,
        current_stock:parts_stock(*)
      `)
      .eq('showroom_id', showroomId);
    
    if (error) {
      console.error('Error fetching parts stats:', error);
      throw error;
    }
    
    // Flatten all parts
    const partsList = (parts || []).map(flattenPartStock);
    
    const stats = {
      totalParts: partsList.length,
      activeParts: partsList.filter(p => p.is_active).length,
      lowStock: partsList.filter(p => {
        const stock = p.current_stock;
        const available = stock?.quantity_available ?? 0;
        return available > 0 && available <= (p.reorder_point || 10);
      }).length,
      outOfStock: partsList.filter(p => {
        const stock = p.current_stock;
        return (stock?.quantity_available ?? 0) <= 0;
      }).length,
      reorderNeeded: partsList.filter(p => {
        const stock = p.current_stock;
        const available = stock?.quantity_available ?? 0;
        return available <= (p.reorder_point || 10);
      }).length,
      totalStockValue: partsList.reduce((sum, p) => {
        const stock = p.current_stock;
        const available = stock?.quantity_available ?? 0;
        const avgCost = stock?.average_cost ?? 0;
        return sum + (available * avgCost);
      }, 0),
      totalCategories: new Set(partsList.map(p => p.category)).size,
      pendingPOs: 0,
    };
    
    return NextResponse.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching parts stats:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch parts statistics',
      stats: {
        totalParts: 0,
        activeParts: 0,
        lowStock: 0,
        outOfStock: 0,
        reorderNeeded: 0,
        totalStockValue: 0,
        totalCategories: 0,
        pendingPOs: 0,
      }
    }, { status: 500 });
  }
}