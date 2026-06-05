// app/api/service-records/[id]/route.ts
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
    
    console.log('GET service record ID:', id);
    
    if (!id || !isValidUUID(id)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid service record ID format' 
      }, { status: 400 });
    }
    
    const showroomId = request.cookies.get('showroom_id')?.value;
    
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
        technician:showroom_users!service_records_completed_by_fkey(id, full_name)
      `)
      .eq('id', id);
    
    if (showroomId) {
      query = query.eq('showroom_id', showroomId);
    }
    
    const { data, error } = await query.single();
    
    if (error) {
      console.error('Error fetching service record:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Service record not found' 
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error in service record detail API:', error);
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
    
    console.log('PUT service record ID:', id);
    console.log('Update body:', JSON.stringify(body, null, 2));
    
    if (!id || !isValidUUID(id)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid service record ID format' 
      }, { status: 400 });
    }
    
    const showroomId = request.cookies.get('showroom_id')?.value;
    const userId = request.cookies.get('user_id')?.value;
    
    // Check if record exists
    const { data: existing, error: checkError } = await supabase
      .from('service_records')
      .select('id, status, vehicle_id, customer_id, showroom_id')
      .eq('id', id)
      .single();
    
    if (checkError || !existing) {
      console.error('Service record not found:', checkError);
      return NextResponse.json({ 
        success: false, 
        error: 'Service record not found' 
      }, { status: 404 });
    }
    
    // Verify showroom ownership
    if (showroomId && existing.showroom_id !== showroomId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Service record does not belong to your showroom' 
      }, { status: 403 });
    }
    
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    
    // Only update provided fields
    if (body.service_date !== undefined) updateData.service_date = body.service_date;
    if (body.service_type !== undefined) updateData.service_type = body.service_type;
    if (body.service_center !== undefined) updateData.service_center = body.service_center;
    if (body.odometer_reading !== undefined) updateData.odometer_reading = body.odometer_reading;
    if (body.customer_complaint !== undefined) updateData.customer_complaint = body.customer_complaint;
    if (body.issues_found !== undefined) updateData.issues_found = body.issues_found;
    if (body.customer_rating !== undefined) updateData.customer_rating = body.customer_rating;
    if (body.work_done !== undefined) updateData.work_done = body.work_done;
    if (body.technician_notes !== undefined) updateData.technician_notes = body.technician_notes;
    if (body.parts_replaced !== undefined) updateData.parts_replaced = body.parts_replaced;
    if (body.battery_health_before !== undefined) updateData.battery_health_before = body.battery_health_before;
    if (body.battery_health_after !== undefined) updateData.battery_health_after = body.battery_health_after;
    if (body.software_version_before !== undefined) updateData.software_version_before = body.software_version_before;
    if (body.software_version_after !== undefined) updateData.software_version_after = body.software_version_after;
    if (body.battery_cells_balanced !== undefined) updateData.battery_cells_balanced = body.battery_cells_balanced;
    if (body.motor_efficiency_check !== undefined) updateData.motor_efficiency_check = body.motor_efficiency_check;
    if (body.charging_port_status !== undefined) updateData.charging_port_status = body.charging_port_status;
    if (body.thermal_management_check !== undefined) updateData.thermal_management_check = body.thermal_management_check;
    if (body.labor_cost !== undefined) updateData.labor_cost = body.labor_cost;
    if (body.parts_cost !== undefined) updateData.parts_cost = body.parts_cost;
    if (body.tax_amount !== undefined) updateData.tax_amount = body.tax_amount;
    if (body.discount_amount !== undefined) updateData.discount_amount = body.discount_amount;
    if (body.next_service_due_km !== undefined) updateData.next_service_due_km = body.next_service_due_km;
    if (body.next_service_due_date !== undefined) updateData.next_service_due_date = body.next_service_due_date;
    if (body.reminder_sent !== undefined) updateData.reminder_sent = body.reminder_sent;
    
    // Status update
    if (body.status !== undefined) {
      updateData.status = body.status;
      if (body.status === 'Completed') {
        updateData.completed_at = new Date().toISOString();
        if (userId) updateData.completed_by = userId;
      }
    }
    
    // Payment update
    if (body.payment_status !== undefined) updateData.payment_status = body.payment_status;
    if (body.payment_method !== undefined) updateData.payment_method = body.payment_method;
    if (body.completed_by !== undefined) updateData.completed_by = body.completed_by;
    
    const { data, error } = await supabase
      .from('service_records')
      .update(updateData)
      .eq('id', id)
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
        technician:showroom_users!service_records_completed_by_fkey(id, full_name)
      `)
      .single();
    
    if (error) {
      console.error('Error updating service record:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message || 'Failed to update service record' 
      }, { status: 500 });
    }
    
    // If completed, update customer vehicle AND appointment
    if (body.status === 'Completed') {
      console.log('Service marked as Completed. Updating vehicle and appointment...');
      
      // Update customer vehicle
      const vehicleUpdates: Record<string, any> = {
        last_service_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      };
      
      if (body.next_service_due_km) vehicleUpdates.next_service_due_km = body.next_service_due_km;
      if (body.next_service_due_date) vehicleUpdates.next_service_due_date = body.next_service_due_date;
      if (body.odometer_reading) vehicleUpdates.current_odometer_km = body.odometer_reading;
      if (body.battery_health_after) {
        vehicleUpdates.battery_health_percentage = body.battery_health_after;
        vehicleUpdates.last_battery_health_check = new Date().toISOString().split('T')[0];
      }
      
      // Update total service count and cost
      const { data: existingVehicle } = await supabase
        .from('customer_vehicles')
        .select('total_service_count, total_service_cost')
        .eq('id', existing.vehicle_id)
        .single();
      
      if (existingVehicle) {
        vehicleUpdates.total_service_count = (existingVehicle.total_service_count || 0) + 1;
        vehicleUpdates.total_service_cost = (existingVehicle.total_service_cost || 0) + 
          ((body.labor_cost || 0) + (body.parts_cost || 0));
      }
      
      vehicleUpdates.vehicle_status = 'Active';
      
      const { error: vehicleError } = await supabase
        .from('customer_vehicles')
        .update(vehicleUpdates)
        .eq('id', existing.vehicle_id);
      
      if (vehicleError) {
        console.error('Error updating customer vehicle:', vehicleError);
      } else {
        console.log('Customer vehicle updated');
      }
      
      // FIX: Find and mark related appointment as "Completed"
      console.log(`Looking for appointment: customer=${existing.customer_id}, vehicle=${existing.vehicle_id}`);
      
      const { data: relatedAppointment, error: apptError } = await supabase
        .from('service_appointments')
        .select('id, status')
        .eq('customer_id', existing.customer_id)
        .eq('vehicle_id', existing.vehicle_id)
        .in('status', ['Scheduled', 'Confirmed', 'In Progress'])
        .order('appointment_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (apptError) {
        console.error('Error finding appointment:', apptError);
      }
      
      if (relatedAppointment) {
        console.log(`Found appointment ${relatedAppointment.id} (status: ${relatedAppointment.status}). Marking as Completed.`);
        
        const { error: updateApptError } = await supabase
          .from('service_appointments')
          .update({
            status: 'Completed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', relatedAppointment.id);
        
        if (updateApptError) {
          console.error('Error updating appointment:', updateApptError);
        } else {
          console.log(`Appointment ${relatedAppointment.id} marked as Completed ✅`);
        }
      } else {
        console.log('No related appointment found to update');
      }
    }
    
    return NextResponse.json({
      success: true,
      data,
      message: body.status === 'Completed' 
        ? 'Service record completed. Vehicle updated. Appointment marked as Completed.' 
        : 'Service record updated successfully'
    });
  } catch (error) {
    console.error('Error in service record update API:', error);
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
    
    console.log('DELETE service record ID:', id);
    
    if (!id || !isValidUUID(id)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid service record ID format' 
      }, { status: 400 });
    }
    
    const showroomId = request.cookies.get('showroom_id')?.value;
    
    // Check if record exists
    const { data: record, error: checkError } = await supabase
      .from('service_records')
      .select('id, showroom_id')
      .eq('id', id)
      .single();
    
    if (checkError || !record) {
      console.error('Service record not found:', checkError);
      return NextResponse.json({ 
        success: false, 
        error: 'Service record not found' 
      }, { status: 404 });
    }
    
    // Verify showroom ownership
    if (showroomId && record.showroom_id !== showroomId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Service record does not belong to your showroom' 
      }, { status: 403 });
    }
    
    const { error } = await supabase
      .from('service_records')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting service record:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to delete service record' 
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Service record deleted successfully'
    });
  } catch (error) {
    console.error('Error in service record delete API:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}