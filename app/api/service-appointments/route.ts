// app/api/service-appointments/route.ts
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
    const date_from = searchParams.get('date_from') || '';
    const date_to = searchParams.get('date_to') || '';
    const customer_id = searchParams.get('customer_id') || '';
    const vehicle_id = searchParams.get('vehicle_id') || '';
    const technician_id = searchParams.get('technician_id') || '';
    
    const showroom_id = request.cookies.get('showroom_id')?.value;
    
    if (!showroom_id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Showroom ID not found in cookies' 
      }, { status: 400 });
    }
    
    const offset = (page - 1) * limit;
    
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
      `, { count: 'exact' })
      .eq('showroom_id', showroom_id);
    
    if (search) {
      query = query.or(
        `customer.first_name.ilike.%${search}%,customer.last_name.ilike.%${search}%,customer.mobile.ilike.%${search}%`
      );
    }
    
    if (status) query = query.eq('status', status);
    if (customer_id) query = query.eq('customer_id', customer_id);
    if (vehicle_id) query = query.eq('vehicle_id', vehicle_id);
    if (technician_id) query = query.eq('assigned_technician_id', technician_id);
    if (date_from) query = query.gte('appointment_date', date_from);
    if (date_to) query = query.lte('appointment_date', date_to);
    
    query = query
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true })
      .range(offset, offset + limit - 1);
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('Error fetching appointments:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch appointments' 
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
    console.error('Error in appointments API:', error);
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
    
    if (!body.customer_id || !body.vehicle_id || !body.appointment_date || !body.appointment_time) {
      return NextResponse.json({ 
        success: false, 
        error: 'Customer, vehicle, date, and time are required' 
      }, { status: 400 });
    }
    
    // Check for duplicate appointment
    const { data: existing } = await supabase
      .from('service_appointments')
      .select('id')
      .eq('customer_id', body.customer_id)
      .eq('vehicle_id', body.vehicle_id)
      .eq('appointment_date', body.appointment_date)
      .eq('appointment_time', body.appointment_time)
      .in('status', ['Scheduled', 'Confirmed', 'In Progress'])
      .maybeSingle();
    
    if (existing) {
      return NextResponse.json({ 
        success: false, 
        error: 'An appointment already exists for this customer and vehicle at the same date and time' 
      }, { status: 409 });
    }
    
    const appointmentData = {
      showroom_id,
      customer_id: body.customer_id,
      vehicle_id: body.vehicle_id,
      appointment_date: body.appointment_date,
      appointment_time: body.appointment_time,
      service_type: body.service_type || null,
      assigned_technician_id: body.assigned_technician_id || null,
      customer_notes: body.customer_notes || null,
      status: body.status || 'Scheduled',
    };
    
    const { data, error } = await supabase
      .from('service_appointments')
      .insert(appointmentData)
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
      console.error('Error creating appointment:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message || 'Failed to create appointment' 
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data,
      message: 'Appointment created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error in appointment create API:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}