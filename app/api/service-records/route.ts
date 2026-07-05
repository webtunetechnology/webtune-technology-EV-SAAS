// app/api/service-records/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createApiClient } from '@/lib/supabase/api-client';

export async function GET(request: NextRequest) {
  try {
    const supabase = createApiClient();
    const searchParams = request.nextUrl.searchParams;
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const service_type = searchParams.get('service_type') || '';
    const payment_status = searchParams.get('payment_status') || '';
    const date_from = searchParams.get('date_from') || '';
    const date_to = searchParams.get('date_to') || '';
    const customer_id = searchParams.get('customer_id') || '';
    const vehicle_id = searchParams.get('vehicle_id') || '';
    
    const showroom_id = request.cookies.get('showroom_id')?.value;
    
    if (!showroom_id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Showroom ID not found in cookies' 
      }, { status: 400 });
    }
    
    const offset = (page - 1) * limit;
    
    let query = supabase
      .from('service_records')
      .select(`
        *,
        customer:customers(id, first_name, last_name, mobile),
        vehicle:customer_vehicles(
          id,
          chassis_number,
          registration_number,
          current_odometer_km,
          vehicle_model:vehicles(
            model_name,
            brand:brands(brand_name)
          )
        ),
      `, { count: 'exact' })
      .eq('showroom_id', showroom_id);
    
    if (search) {
      query = query.or(
        `customer.first_name.ilike.%${search}%,customer.last_name.ilike.%${search}%,customer.mobile.ilike.%${search}%`
      );
    }
    
    if (status) query = query.eq('status', status);
    if (service_type) query = query.eq('service_type', service_type);
    if (payment_status) query = query.eq('payment_status', payment_status);
    if (customer_id) query = query.eq('customer_id', customer_id);
    if (vehicle_id) query = query.eq('vehicle_id', vehicle_id);
    if (date_from) query = query.gte('service_date', date_from);
    if (date_to) query = query.lte('service_date', date_to);
    
    const { data, error, count } = await query
      .order('service_date', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('Error fetching service records:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch service records' 
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    });
  } catch (error) {
    console.error('Error in service records API:', error);
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
    const user_id = request.cookies.get('user_id')?.value;
    
    if (!showroom_id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Showroom ID not found in cookies' 
      }, { status: 400 });
    }
    
    console.log('Creating service record:', JSON.stringify(body, null, 2));
    
    // Validate required fields
    if (!body.customer_id || !body.vehicle_id || body.odometer_reading === undefined || body.odometer_reading === null) {
      return NextResponse.json({ 
        success: false, 
        error: 'Customer, vehicle, and odometer reading are required' 
      }, { status: 400 });
    }
    
    const isCompleted = body.status === 'Completed';
    
    // Create service record
    const serviceData = {
      showroom_id,
      customer_id: body.customer_id,
      vehicle_id: body.vehicle_id,
      service_date: body.service_date || new Date().toISOString().split('T')[0],
      service_type: body.service_type || 'Free Service',
      service_center: body.service_center || null,
      odometer_reading: body.odometer_reading,
      customer_complaint: body.customer_complaint || null,
      issues_found: body.issues_found || null,
      work_done: body.work_done || null,
      technician_notes: body.technician_notes || null,
      parts_replaced: body.parts_replaced || null,
      battery_health_before: body.battery_health_before || null,
      battery_health_after: body.battery_health_after || null,
      software_version_before: body.software_version_before || null,
      software_version_after: body.software_version_after || null,
      battery_cells_balanced: body.battery_cells_balanced !== undefined ? body.battery_cells_balanced : true,
      motor_efficiency_check: body.motor_efficiency_check || null,
      charging_port_status: body.charging_port_status || null,
      thermal_management_check: body.thermal_management_check || null,
      labor_cost: body.labor_cost || 0,
      parts_cost: body.parts_cost || 0,
      tax_amount: body.tax_amount || 0,
      discount_amount: body.discount_amount || 0,
      payment_status: body.payment_status || 'Pending',
      payment_method: body.payment_method || null,
      next_service_due_km: body.next_service_due_km || null,
      next_service_due_date: body.next_service_due_date || null,
      status: body.status || 'In Progress',
      customer_rating: body.customer_rating || null,
      completed_by: isCompleted ? user_id : null,
      completed_at: isCompleted ? new Date().toISOString() : null,
    };
    
    const { data: record, error: recordError } = await supabase
      .from('service_records')
      .insert(serviceData)
      .select()
      .single();
    
    if (recordError) {
      console.error('Error creating service record:', recordError);
      return NextResponse.json({ 
        success: false, 
        error: recordError.message || 'Failed to create service record' 
      }, { status: 500 });
    }
    
    console.log('Service record created:', record.id);
    
    // Handle parts deduction from stock
    if (body.parts_replaced && Array.isArray(body.parts_replaced) && body.parts_replaced.length > 0) {
      for (const part of body.parts_replaced) {
        if (part.part_id && part.quantity > 0) {
          // Get current stock
          const { data: stockData } = await supabase
            .from('parts_stock')
            .select('*')
            .eq('part_id', part.part_id)
            .eq('showroom_id', showroom_id)
            .single();
          
          if (stockData) {
            const newQuantityOnHand = Math.max(0, (stockData.quantity_on_hand || 0) - part.quantity);
            
            // Update stock - only quantity_on_hand (quantity_available is generated)
            await supabase
              .from('parts_stock')
              .update({
                quantity_on_hand: newQuantityOnHand,
                updated_at: new Date().toISOString(),
              })
              .eq('id', stockData.id);
            
            // Create transaction record
            await supabase
              .from('parts_transactions')
              .insert({
                showroom_id,
                part_id: part.part_id,
                transaction_type: 'Service_Used',
                quantity: part.quantity,
                unit_cost: part.unit_price || stockData.average_cost || 0,
                total_amount: part.total || (part.quantity * (part.unit_price || stockData.average_cost || 0)),
                reference_type: 'service_record',
                reference_id: record.id,
                service_record_id: record.id,
                customer_id: body.customer_id,
                performed_by: user_id || showroom_id,
                notes: `Used in service record ${record.id}`,
                transaction_date: new Date().toISOString(),
              });
            
            console.log(`Deducted ${part.quantity} of part ${part.part_id} from stock`);
          }
        }
      }
    }
    
    // Update customer vehicle
    const vehicleUpdateData: Record<string, any> = {
      current_odometer_km: body.odometer_reading,
      last_service_date: body.service_date || new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString(),
    };
    
    if (body.next_service_due_km) vehicleUpdateData.next_service_due_km = body.next_service_due_km;
    if (body.next_service_due_date) vehicleUpdateData.next_service_due_date = body.next_service_due_date;
    if (body.battery_health_after) {
      vehicleUpdateData.battery_health_percentage = body.battery_health_after;
      vehicleUpdateData.last_battery_health_check = new Date().toISOString().split('T')[0];
    }
    
    // Get current vehicle stats to increment
    const { data: currentVehicle } = await supabase
      .from('customer_vehicles')
      .select('total_service_count, total_service_cost')
      .eq('id', body.vehicle_id)
      .single();
    
    if (currentVehicle) {
      vehicleUpdateData.total_service_count = (currentVehicle.total_service_count || 0) + 1;
      vehicleUpdateData.total_service_cost = (currentVehicle.total_service_cost || 0) + 
        ((body.labor_cost || 0) + (body.parts_cost || 0));
    }
    
    if (isCompleted) {
      vehicleUpdateData.vehicle_status = 'Active';
    }
    
    const { error: vehicleError } = await supabase
      .from('customer_vehicles')
      .update(vehicleUpdateData)
      .eq('id', body.vehicle_id);
    
    if (vehicleError) {
      console.error('Error updating customer vehicle:', vehicleError);
    }
    
    // Auto-update appointment to "In Progress" (or "Completed" if service is already completed)
    const appointmentStatus = isCompleted ? 'Completed' : 'In Progress';
    
    // Find related appointment
    const { data: relatedAppointment } = await supabase
      .from('service_appointments')
      .select('id, status')
      .eq('customer_id', body.customer_id)
      .eq('vehicle_id', body.vehicle_id)
      .in('status', ['Scheduled', 'Confirmed', 'In Progress'])
      .order('appointment_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (relatedAppointment) {
      console.log(`Updating appointment ${relatedAppointment.id} to "${appointmentStatus}"`);
      await supabase
        .from('service_appointments')
        .update({
          status: appointmentStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', relatedAppointment.id);
    }
    
    // If appointment_id was provided, update it too
    if (body.appointment_id) {
      await supabase
        .from('service_appointments')
        .update({
          status: appointmentStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', body.appointment_id)
        .eq('showroom_id', showroom_id);
    }
    
    // ── Auto-generate a service invoice ─────────────────────────────────────
    try {
      // Build a sequential invoice number: SRV/YYMM/0001
      const { count: invoiceCount } = await supabase
        .from('service_invoices')
        .select('id', { count: 'exact', head: true })
        .eq('showroom_id', showroom_id);

      const seq = ((invoiceCount ?? 0) + 1).toString().padStart(4, '0');
      const now = new Date();
      const yy  = now.getFullYear().toString().slice(-2);
      const mm  = (now.getMonth() + 1).toString().padStart(2, '0');
      const invoiceNumber = `SRV/${yy}${mm}/${seq}`;

      const laborCost    = Number(body.labor_cost    || 0);
      const partsCost    = Number(body.parts_cost    || 0);
      const taxAmount    = Number(body.tax_amount    || 0);
      const discAmount   = Number(body.discount_amount || 0);
      const totalAmount  = laborCost + partsCost + taxAmount - discAmount;

      await supabase.from('service_invoices').insert({
        showroom_id,
        service_record_id : record.id,
        customer_id       : body.customer_id,
        vehicle_id        : body.vehicle_id,
        invoice_number    : invoiceNumber,
        invoice_date      : body.service_date || now.toISOString().split('T')[0],
        service_type      : body.service_type || 'Free Service',
        labor_cost        : laborCost,
        parts_cost        : partsCost,
        tax_amount        : taxAmount,
        discount_amount   : discAmount,
        total_amount      : totalAmount,
        payment_status    : body.payment_status || 'Pending',
        payment_method    : body.payment_method || null,
        parts_detail      : body.parts_replaced  || null,
        notes             : body.technician_notes || null,
      });

      console.log(`Service invoice ${invoiceNumber} created for record ${record.id}`);
    } catch (invErr) {
      // Non-fatal — log but don't fail the service record creation
      console.error('Failed to auto-create service invoice:', invErr);
    }
    // ────────────────────────────────────────────────────────────────────────

    // Fetch complete record with relations
    const { data: completeRecord } = await supabase
      .from('service_records')
      .select(`
        *,
        customer:customers(id, first_name, last_name, mobile),
        vehicle:customer_vehicles(
          id,
          chassis_number,
          registration_number,
          current_odometer_km,
          vehicle_model:vehicles(
            model_name,
            brand:brands(brand_name)
          )
        ),
      `)
      .eq('id', record.id)
      .single();
    
    return NextResponse.json({
      success: true,
      data: completeRecord || record,
      message: `Service record created. ${body.parts_replaced?.length > 0 ? 'Parts deducted from stock.' : ''} Appointment updated to "${appointmentStatus}". Service invoice generated.`
    }, { status: 201 });
  } catch (error) {
    console.error('Error in service record create API:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
