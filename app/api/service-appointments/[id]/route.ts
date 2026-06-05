// app/api/service-appointments/[id]/route.ts
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
    
    if (!id || !isValidUUID(id)) {
      return NextResponse.json({ success: false, error: 'Invalid appointment ID' }, { status: 400 });
    }
    
    const showroomId = request.cookies.get('showroom_id')?.value;
    
    let query = supabase
      .from('service_appointments')
      .select(`
        *,
        customer:customers(id, first_name, last_name, mobile),
        vehicle:customer_vehicles(
          id,
          chassis_number,
          registration_number,
          vehicle_model:vehicles(
            model_name,
            brand:brands(brand_name)
          )
        ),
        technician:showroom_users(id, full_name)
      `)
      .eq('id', id);
    
    if (showroomId) query = query.eq('showroom_id', showroomId);
    
    const { data, error } = await query.single();
    
    if (error) {
      return NextResponse.json({ success: false, error: 'Appointment not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in appointment detail API:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
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
    
    if (!id || !isValidUUID(id)) {
      return NextResponse.json({ success: false, error: 'Invalid appointment ID' }, { status: 400 });
    }
    
    const showroomId = request.cookies.get('showroom_id')?.value;
    
    const { data: existing, error: checkError } = await supabase
      .from('service_appointments')
      .select('id, showroom_id')
      .eq('id', id)
      .single();
    
    if (checkError || !existing) {
      return NextResponse.json({ success: false, error: 'Appointment not found' }, { status: 404 });
    }
    
    if (showroomId && existing.showroom_id !== showroomId) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }
    
    const appointmentData: Record<string, any> = { updated_at: new Date().toISOString() };
    
    if (body.customer_id !== undefined) appointmentData.customer_id = body.customer_id;
    if (body.vehicle_id !== undefined) appointmentData.vehicle_id = body.vehicle_id;
    if (body.appointment_date !== undefined) appointmentData.appointment_date = body.appointment_date;
    if (body.appointment_time !== undefined) appointmentData.appointment_time = body.appointment_time;
    if (body.service_type !== undefined) appointmentData.service_type = body.service_type || null;
    if (body.assigned_technician_id !== undefined) appointmentData.assigned_technician_id = body.assigned_technician_id || null;
    if (body.customer_notes !== undefined) appointmentData.customer_notes = body.customer_notes || null;
    if (body.status !== undefined) appointmentData.status = body.status;
    
    const { data, error } = await supabase
      .from('service_appointments')
      .update(appointmentData)
      .eq('id', id)
      .select(`
        *,
        customer:customers(id, first_name, last_name, mobile),
        vehicle:customer_vehicles(
          id,
          chassis_number,
          registration_number,
          vehicle_model:vehicles(
            model_name,
            brand:brands(brand_name)
          )
        ),
        technician:showroom_users(id, full_name)
      `)
      .single();
    
    if (error) {
      return NextResponse.json({ success: false, error: error.message || 'Failed to update' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, data, message: 'Appointment updated' });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createApiClient();
    const { id } = await params;
    
    if (!id || !isValidUUID(id)) {
      return NextResponse.json({ success: false, error: 'Invalid appointment ID' }, { status: 400 });
    }
    
    const showroomId = request.cookies.get('showroom_id')?.value;
    
    const { data: existing, error: checkError } = await supabase
      .from('service_appointments')
      .select('id, showroom_id')
      .eq('id', id)
      .single();
    
    if (checkError || !existing) {
      return NextResponse.json({ success: false, error: 'Appointment not found' }, { status: 404 });
    }
    
    if (showroomId && existing.showroom_id !== showroomId) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }
    
    const { error } = await supabase
      .from('service_appointments')
      .delete()
      .eq('id', id);
    
    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, message: 'Appointment deleted' });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}