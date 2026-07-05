import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getShowroomId(request: NextRequest): string | null {
  return request.cookies.get('showroom_id')?.value || null;
}

// ── GET /api/parts-invoices  (list) ──────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const showroomId = getShowroomId(request);
    if (!showroomId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const supabase = createClient(supabaseUrl, serviceKey);
    const params   = request.nextUrl.searchParams;
    const limit    = parseInt(params.get('limit') || '100');
    const search   = params.get('search') || '';

    let query = supabase
      .from('parts_counter_sales')
      .select(`
        id, sale_number, sale_date, customer_id,
        customer_name, customer_mobile,
        subtotal, tax_amount, discount_amount, total_amount,
        payment_method, payment_status, notes, created_at,
        items:parts_counter_sale_items(id, quantity, unit_price, total_price)
      `, { count: 'exact' })
      .eq('showroom_id', showroomId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (search) {
      query = query.or(`sale_number.ilike.%${search}%,customer_name.ilike.%${search}%,customer_mobile.ilike.%${search}%`);
    }

    const { data, error, count } = await query;
    if (error) {
      console.error('Parts invoices GET error:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch parts invoices' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [], total: count || 0 });
  } catch (err) {
    console.error('Parts invoices GET error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// ── POST /api/parts-invoices  (create) ───────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const showroomId = getShowroomId(request);
    if (!showroomId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const {
      customer_id,
      customer_name,
      customer_mobile,
      sale_date,
      items,          // [{ part_id, part_name, hsn_code, quantity, unit_price }]
      discount_amount = 0,
      payment_method  = 'Cash',
      payment_status  = 'Paid',
      notes           = '',
      sold_by,
    } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ success: false, error: 'At least one item is required' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Generate sale number: PCS-YYYYMM-NNNN
    const now  = new Date();
    const ym   = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const { count: existing } = await supabase
      .from('parts_counter_sales')
      .select('id', { count: 'exact', head: true })
      .eq('showroom_id', showroomId)
      .like('sale_number', `PCS-${ym}-%`);
    const seq       = (existing || 0) + 1;
    const saleNumber = `PCS-${ym}-${String(seq).padStart(4, '0')}`;

    // Compute totals
    const subtotal   = items.reduce((sum: number, it: any) => sum + Number(it.unit_price) * Number(it.quantity), 0);
    const taxAmount  = items.reduce((sum: number, it: any) => {
      const gstPct = Number(it.gst_percentage || 0);
      return sum + (Number(it.unit_price) * Number(it.quantity) * gstPct) / 100;
    }, 0);
    const totalAmount = Math.round((subtotal + taxAmount - Number(discount_amount)) * 100) / 100;

    // Insert header
    const { data: sale, error: saleErr } = await supabase
      .from('parts_counter_sales')
      .insert({
        showroom_id     : showroomId,
        sale_number     : saleNumber,
        sale_date       : sale_date || now.toISOString().split('T')[0],
        customer_id     : customer_id || null,
        customer_name   : customer_name || null,
        customer_mobile : customer_mobile || null,
        subtotal        : Math.round(subtotal * 100) / 100,
        tax_amount      : Math.round(taxAmount * 100) / 100,
        discount_amount : Number(discount_amount),
        total_amount    : totalAmount,
        payment_method,
        payment_status,
        notes,
        sold_by         : sold_by || null,
      })
      .select()
      .single();

    if (saleErr || !sale) {
      console.error('Parts invoice insert error:', saleErr);
      return NextResponse.json({ success: false, error: 'Failed to create invoice' }, { status: 500 });
    }

    // Insert line items
    const lineItems = items.map((it: any) => ({
      counter_sale_id : sale.id,
      part_id         : it.part_id,
      quantity        : Number(it.quantity),
      unit_price      : Number(it.unit_price),
      total_price     : Math.round(Number(it.unit_price) * Number(it.quantity) * 100) / 100,
    }));

    const { error: itemErr } = await supabase
      .from('parts_counter_sale_items')
      .insert(lineItems);

    if (itemErr) {
      console.error('Parts invoice items insert error:', itemErr);
      // Roll back the header
      await supabase.from('parts_counter_sales').delete().eq('id', sale.id);
      return NextResponse.json({ success: false, error: 'Failed to save invoice items' }, { status: 500 });
    }

    // Reduce stock for each part
    for (const it of items) {
      const { data: stock } = await supabase
        .from('parts_stock')
        .select('id, quantity_available, quantity_on_hand')
        .eq('part_id', it.part_id)
        .eq('showroom_id', showroomId)
        .single();

      if (stock) {
        await supabase
          .from('parts_stock')
          .update({
            quantity_available : Math.max(0, (stock.quantity_available || 0) - Number(it.quantity)),
            quantity_on_hand   : Math.max(0, (stock.quantity_on_hand   || 0) - Number(it.quantity)),
            updated_at         : new Date().toISOString(),
          })
          .eq('id', stock.id);
      }
    }

    return NextResponse.json({ success: true, data: sale });
  } catch (err) {
    console.error('Parts invoice POST error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
