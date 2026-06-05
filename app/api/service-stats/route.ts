// app/api/service-stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createApiClient } from '@/lib/supabase/api-client';

export async function GET(request: NextRequest) {
  try {
    const supabase = createApiClient();
    const showroom_id = request.cookies.get('showroom_id')?.value;
    
    if (!showroom_id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Showroom ID not found' 
      }, { status: 400 });
    }
    
    const today = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    
    // Today's appointments
    const { count: todayAppointments } = await supabase
      .from('service_appointments')
      .select('*', { count: 'exact', head: true })
      .eq('showroom_id', showroom_id)
      .eq('appointment_date', today);
    
    // In progress services
    const { count: inProgress } = await supabase
      .from('service_records')
      .select('*', { count: 'exact', head: true })
      .eq('showroom_id', showroom_id)
      .eq('status', 'In Progress');
    
    // Completed today
    const { count: completedToday } = await supabase
      .from('service_records')
      .select('*', { count: 'exact', head: true })
      .eq('showroom_id', showroom_id)
      .eq('status', 'Completed')
      .gte('completed_at', today);
    
    // Pending payments
    const { count: pendingPayments } = await supabase
      .from('service_records')
      .select('*', { count: 'exact', head: true })
      .eq('showroom_id', showroom_id)
      .eq('payment_status', 'Pending');
    
    // Monthly revenue
    const { data: monthlyRecords } = await supabase
      .from('service_records')
      .select('labor_cost, parts_cost, tax_amount, discount_amount')
      .eq('showroom_id', showroom_id)
      .gte('service_date', firstDayOfMonth)
      .eq('payment_status', 'Paid');
    
    const totalRevenue = (monthlyRecords || []).reduce((sum, r) => {
      return sum + (r.labor_cost || 0) + (r.parts_cost || 0) + (r.tax_amount || 0) - (r.discount_amount || 0);
    }, 0);
    
    // Average rating
    const { data: ratings } = await supabase
      .from('service_records')
      .select('customer_rating')
      .eq('showroom_id', showroom_id)
      .not('customer_rating', 'is', null);
    
    const avgRating = ratings && ratings.length > 0
      ? (ratings.reduce((sum, r) => sum + (r.customer_rating || 0), 0) / ratings.length).toFixed(1)
      : '0.0';
    
    return NextResponse.json({
      success: true,
      stats: {
        todayAppointments: todayAppointments || 0,
        inProgress: inProgress || 0,
        completedToday: completedToday || 0,
        pendingPayments: pendingPayments || 0,
        totalRevenue: totalRevenue || 0,
        avgRating: parseFloat(avgRating),
      }
    });
  } catch (error) {
    console.error('Error fetching service stats:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch statistics' 
    }, { status: 500 });
  }
}