import { NextRequest, NextResponse } from 'next/server';
import { createApiClient } from '@/lib/supabase/api-client';

// ── GET  /api/service-invoices ──────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const supabase = createApiClient();
    const showroom_id = request.cookies.get('showroom_id')?.value;
    if (!showroom_id) {
      return NextResponse.json({ success: false, error: 'Showroom ID not found' }, { status: 400 });
    }

    const params = request.nextUrl.searchParams;
    const page   = parseInt(params.get('page')  || '1');
    const limit  = parseInt(params.get('limit') || '50');
    const search = params.get('search') || '';
    const offset = (page - 1) * limit;

    let query = supabase
      .from('service_invoices')
      .select(`
        *,
        customer:customers(id, first_name, last_name, mobile),
        vehicle:customer_vehicles(
          id, chassis_number, registration_number,
          vehicle_model:vehicles(model_name, variant_name, brand:brands(brand_name))
        ),
        showroom:showrooms(showroom_name, gst_number, pan_number)
      `, { count: 'exact' })
      .eq('showroom_id', showroom_id)
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(
        `invoice_number.ilike.%${search}%`
      );
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching service invoices:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch service invoices' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      total: count || 0,
      page,
      limit,
    });
  } catch (error) {
    console.error('Service invoices GET error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
