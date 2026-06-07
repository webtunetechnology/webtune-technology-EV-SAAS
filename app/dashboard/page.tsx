'use client';

import { useState, useEffect } from 'react';
import {
  DollarSign, Wrench, FileText, TrendingUp,
  Car, Star, Loader2, ShoppingCart, PhoneCall, Calendar
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

// ------------------------------
// Types
// ------------------------------
interface ServiceRecord {
  id: string;
  status: string;
  service_type: string;
  created_at: string;
  completed_at: string | null;
  customer_rating: number | null;
  customer_id: string;
  vehicle_id: string;
  _customer?: { first_name: string; last_name: string } | null;
  _vehicle?: { registration_number: string; vehicle_model_id: string } | null;
}

interface SalesInvoice {
  id: string;
  invoice_number: string;
  payment_status: string;
  ex_showroom_price: number;
  created_at: string;
  customer_id: string;
  _customer?: { first_name: string; last_name: string } | null;
}

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  service_type: string;
  customer_id: string;
  _customer?: { first_name: string; last_name: string } | null;
}

interface WeeklyDay {
  day: string;
  revenue: number;
}

// ------------------------------
// Compact Metric Card
// ------------------------------
const MetricCard = ({ title, value, icon: Icon, color, subText, loading }: { 
  title: string; 
  value: string | number; 
  icon: any; 
  color: string; 
  subText?: string;
  loading?: boolean;
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="h-3 bg-gray-200 rounded w-16 mb-1 animate-pulse"></div>
            <div className="h-6 bg-gray-200 rounded w-24 animate-pulse"></div>
          </div>
          <div className="h-8 w-8 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs font-medium text-gray-500">{title}</p>
          <p className="text-xl font-bold text-gray-800">{value}</p>
          {subText && <p className="text-xs text-gray-400 mt-0.5">{subText}</p>}
        </div>
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center bg-${color}-50`}>
          <Icon size={16} className={`text-${color}-600`} />
        </div>
      </div>
    </div>
  );
};

// ------------------------------
// Main Dashboard Component
// ------------------------------
export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  
  const [stats, setStats] = useState({
    totalCustomers: 0,
    newLeadsThisMonth: 0,
    availableInventory: 0,
    activeServices: 0,
    completedServices: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    pendingPayments: 0,
    avgServiceTime: 0,
    avgRating: 0,
    conversionRate: 0,
    testRidesThisMonth: 0,
    partsRevenue: 0
  });
  
  const [recentServices, setRecentServices] = useState<ServiceRecord[]>([]);
  const [recentSales, setRecentSales] = useState<SalesInvoice[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyDay[]>([]);
  const [leadStats, setLeadStats] = useState({
    total: 0, contacted: 0, interested: 0, testRide: 0, negotiation: 0, converted: 0, lost: 0
  });

  useEffect(() => {
    fetchShowroomAndData();
  }, []);

  async function fetchShowroomAndData() {
    try {
      const showroomStr = localStorage.getItem('showroom');
      let sId = null;
      
      if (showroomStr) {
        try {
          const showroomData = JSON.parse(showroomStr);
          sId = showroomData.id;
        } catch (e) {}
      }
      
      if (!sId) {
        const cookieShowroomId = document.cookie.split(';').find(c => c.trim().startsWith('showroom_id='));
        if (cookieShowroomId) sId = cookieShowroomId.split('=')[1];
      }
      
      if (sId) {
        await fetchAllStats(sId);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAllStats(showroomId: string) {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [
        customersRes,
        inventoryRes,
        servicesRes,
        salesRes,
        testRidesRes,
        partsRes,
        appointmentsRes
      ] = await Promise.all([
        supabase.from('customers').select('id, lead_status, customer_status, created_at').eq('showroom_id', showroomId).is('deleted_at', null),
        supabase.from('inventory').select('id, stock_status').eq('showroom_id', showroomId),
        supabase.from('service_records').select('id, status, service_type, created_at, completed_at, customer_rating, customer_id, vehicle_id').eq('showroom_id', showroomId).order('created_at', { ascending: false }),
        supabase.from('sales_invoices').select('id, invoice_number, payment_status, ex_showroom_price, created_at, customer_id').eq('showroom_id', showroomId).eq('is_cancelled', false).order('created_at', { ascending: false }),
        supabase.from('test_ride_bookings').select('id, converted_to_sale, booking_date').eq('showroom_id', showroomId),
        supabase.from('parts_counter_sales').select('total_amount').eq('showroom_id', showroomId),
        supabase.from('service_appointments').select('id, appointment_date, appointment_time, service_type, customer_id').eq('showroom_id', showroomId).gte('appointment_date', now.toISOString().split('T')[0]).order('appointment_date', { ascending: true }).limit(5)
      ]);

      const customers = customersRes.data || [];
      const inventory = inventoryRes.data || [];
      const services = servicesRes.data || [];
      const sales = salesRes.data || [];
      const testRides = testRidesRes.data || [];
      const partsSales = partsRes.data || [];
      const appointments = appointmentsRes.data || [];

      const totalCustomers = customers.filter((c: any) => c.customer_status === 'Active').length;
      const newLeadsThisMonth = customers.filter((c: any) => c.created_at && new Date(c.created_at) >= startOfMonth).length;
      const availableInventory = inventory.filter((i: any) => i.stock_status === 'Available').length;
      const activeServices = services.filter((s: any) => ['Scheduled', 'In Progress', 'Delayed'].includes(s.status)).length;
      const completedServices = services.filter((s: any) => s.status === 'Completed').length;
      
      const totalRevenue = sales.reduce((sum: number, s: any) => sum + (s.ex_showroom_price || 0), 0);
      const monthlyRevenue = sales.filter((s: any) => s.created_at && new Date(s.created_at) >= startOfMonth).reduce((sum: number, s: any) => sum + (s.ex_showroom_price || 0), 0);
      const pendingPayments = sales.filter((s: any) => ['Pending', 'Partial'].includes(s.payment_status)).length;
      const partsRevenue = partsSales.reduce((sum: number, s: any) => sum + (s.total_amount || 0), 0);

      const completedList = services.filter((s: any) => s.status === 'Completed' && s.completed_at && s.created_at);
      const avgServiceTime = completedList.length > 0 
        ? completedList.reduce((acc: number, s: any) => acc + (new Date(s.completed_at).getTime() - new Date(s.created_at).getTime()) / 3600000, 0) / completedList.length 
        : 0;
      const ratedServices = services.filter((s: any) => s.customer_rating);
      const avgRating = ratedServices.length > 0 ? ratedServices.reduce((acc: number, s: any) => acc + (s.customer_rating || 0), 0) / ratedServices.length : 0;

      const totalTestRides = testRides.length;
      const convertedRides = testRides.filter((t: any) => t.converted_to_sale).length;
      const conversionRate = totalTestRides > 0 ? (convertedRides / totalTestRides) * 100 : 0;
      const testRidesThisMonth = testRides.filter((t: any) => t.booking_date >= startOfMonth.toISOString().split('T')[0]).length;

      setLeadStats({
        total: customers.length,
        contacted: customers.filter((c: any) => ['Contacted', 'Interested', 'Test Ride Done', 'Negotiation', 'Converted'].includes(c.lead_status)).length,
        interested: customers.filter((c: any) => c.lead_status === 'Interested').length,
        testRide: customers.filter((c: any) => c.lead_status === 'Test Ride Done').length,
        negotiation: customers.filter((c: any) => c.lead_status === 'Negotiation').length,
        converted: customers.filter((c: any) => c.lead_status === 'Converted').length,
        lost: customers.filter((c: any) => c.lead_status === 'Lost').length
      });

      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const weeklyTrend: WeeklyDay[] = [];
      for (let i = 6; i >= 0; i--) {
        const day = new Date(now);
        day.setDate(now.getDate() - i);
        day.setHours(0, 0, 0, 0);
        const nextDay = new Date(day);
        nextDay.setDate(day.getDate() + 1);
        
        const dayRevenue = sales.filter((s: any) => {
          if (!s.created_at) return false;
          const d = new Date(s.created_at);
          return d >= day && d < nextDay;
        }).reduce((sum: number, s: any) => sum + (s.ex_showroom_price || 0), 0);
        
        weeklyTrend.push({
          day: day.toLocaleDateString('en-US', { weekday: 'short' }),
          revenue: dayRevenue
        });
      }
      setWeeklyData(weeklyTrend);

      const recentServicesList: ServiceRecord[] = services.slice(0, 5);
      const recentSalesList: SalesInvoice[] = sales.slice(0, 5);
      const appointmentsList: Appointment[] = appointments;

      // Fetch related data
      if (recentServicesList.length > 0) {
        const customerIds = [...new Set(recentServicesList.map(s => s.customer_id))];
        const vehicleIds = [...new Set(recentServicesList.map(s => s.vehicle_id))];
        
        const [custRes, vehRes] = await Promise.all([
          supabase.from('customers').select('id, first_name, last_name').in('id', customerIds),
          supabase.from('customer_vehicles').select('id, registration_number, vehicle_model_id').in('id', vehicleIds)
        ]);
        
        const custMap = Object.fromEntries((custRes.data || []).map((c: any) => [c.id, c]));
        const vehMap = Object.fromEntries((vehRes.data || []).map((v: any) => [v.id, v]));
        
        recentServicesList.forEach(s => {
          s._customer = custMap[s.customer_id] || null;
          s._vehicle = vehMap[s.vehicle_id] || null;
        });
      }

      if (recentSalesList.length > 0) {
        const saleCustIds = [...new Set(recentSalesList.map(s => s.customer_id))];
        const { data: saleCusts } = await supabase.from('customers').select('id, first_name, last_name').in('id', saleCustIds);
        const saleCustMap = Object.fromEntries((saleCusts || []).map((c: any) => [c.id, c]));
        recentSalesList.forEach(s => { s._customer = saleCustMap[s.customer_id] || null; });
      }

      if (appointmentsList.length > 0) {
        const apptCustIds = [...new Set(appointmentsList.map(a => a.customer_id))];
        const { data: apptCusts } = await supabase.from('customers').select('id, first_name, last_name').in('id', apptCustIds);
        const apptCustMap = Object.fromEntries((apptCusts || []).map((c: any) => [c.id, c]));
        appointmentsList.forEach(a => { a._customer = apptCustMap[a.customer_id] || null; });
      }

      setStats({
        totalCustomers, newLeadsThisMonth, availableInventory,
        activeServices, completedServices, totalRevenue, monthlyRevenue,
        pendingPayments, avgServiceTime: Math.round(avgServiceTime * 10) / 10,
        avgRating: Math.round(avgRating * 10) / 10,
        conversionRate: Math.round(conversionRate * 10) / 10,
        testRidesThisMonth, partsRevenue
      });
      
      setRecentServices(recentServicesList);
      setRecentSales(recentSalesList);
      setUpcomingAppointments(appointmentsList);
      
    } catch (error) {
      console.error('Error:', error);
    }
  }

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
    return `₹${amount}`;
  };

  const statusColors: Record<string, string> = {
    'Scheduled': 'bg-purple-100 text-purple-700',
    'In Progress': 'bg-blue-100 text-blue-700',
    'Completed': 'bg-green-100 text-green-700',
    'Cancelled': 'bg-red-100 text-red-700',
    'Delayed': 'bg-orange-100 text-orange-700',
    'Confirmed': 'bg-cyan-100 text-cyan-700'
  };

  const paymentColors: Record<string, string> = {
    'Paid': 'bg-green-100 text-green-700',
    'Pending': 'bg-yellow-100 text-yellow-700',
    'Partial': 'bg-blue-100 text-blue-700',
    'Financed': 'bg-purple-100 text-purple-700'
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50 p-3 space-y-3 overflow-auto">
      
      {/* Row 1: Key Metrics - 5 columns */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
        <MetricCard title="Revenue (MTD)" value={formatCurrency(stats.monthlyRevenue)} icon={DollarSign} color="emerald" subText={`Total: ${formatCurrency(stats.totalRevenue)}`} loading={loading} />
        <MetricCard title="Active Services" value={stats.activeServices} icon={Wrench} color="blue" subText={`${stats.completedServices} completed`} loading={loading} />
        <MetricCard title="Available Stock" value={stats.availableInventory} icon={Car} color="green" subText={`${stats.newLeadsThisMonth} new leads`} loading={loading} />
        <MetricCard title="Pending Payments" value={stats.pendingPayments} icon={FileText} color="amber" subText={`Parts: ${formatCurrency(stats.partsRevenue)}`} loading={loading} />
        <MetricCard title="Avg Rating" value={stats.avgRating > 0 ? `${stats.avgRating}/5` : 'N/A'} icon={Star} color="yellow" subText={`${stats.avgServiceTime}h avg time`} loading={loading} />
      </div>

      {/* Row 2: Charts - 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {/* Weekly Revenue */}
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
            <TrendingUp size={14} className="text-green-600" />
            Weekly Revenue
          </h3>
          <div className="h-32 flex items-end gap-1">
            {weeklyData.map((day, i) => {
              const maxRev = Math.max(...weeklyData.map(d => d.revenue), 1);
              const height = Math.max(4, (day.revenue / maxRev) * 100);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                  <span className="text-[10px] text-gray-500">{day.revenue > 0 ? formatCurrency(day.revenue) : ''}</span>
                  <div className="w-full bg-green-500 rounded-t hover:bg-green-600 transition-colors" style={{ height: `${height}px`, minHeight: '4px' }}></div>
                  <span className="text-[10px] text-gray-400">{day.day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lead Pipeline */}
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
            <PhoneCall size={14} className="text-blue-600" />
            Lead Pipeline
          </h3>
          <div className="space-y-1.5">
            {[
              { label: 'Total', value: leadStats.total, color: 'bg-gray-500', width: 100 },
              { label: 'Contacted', value: leadStats.contacted, color: 'bg-blue-500', width: (leadStats.contacted / Math.max(leadStats.total, 1)) * 100 },
              { label: 'Interested', value: leadStats.interested, color: 'bg-indigo-500', width: (leadStats.interested / Math.max(leadStats.total, 1)) * 100 },
              { label: 'Test Ride', value: leadStats.testRide, color: 'bg-teal-500', width: (leadStats.testRide / Math.max(leadStats.total, 1)) * 100 },
              { label: 'Negotiation', value: leadStats.negotiation, color: 'bg-orange-500', width: (leadStats.negotiation / Math.max(leadStats.total, 1)) * 100 },
              { label: 'Converted', value: leadStats.converted, color: 'bg-emerald-500', width: (leadStats.converted / Math.max(leadStats.total, 1)) * 100 },
              { label: 'Lost', value: leadStats.lost, color: 'bg-red-500', width: (leadStats.lost / Math.max(leadStats.total, 1)) * 100 }
            ].map(stage => (
              <div key={stage.label} className="flex items-center gap-2">
                <span className="text-[11px] text-gray-600 w-16">{stage.label}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-4">
                  <div className={`${stage.color} h-4 rounded-full flex items-center justify-end pr-1.5 transition-all`} style={{ width: `${Math.max(2, stage.width)}%` }}>
                    <span className="text-[10px] text-white font-medium">{stage.value}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2 text-[11px]">
            <span className="text-gray-500">Conversion:</span>
            <span className="font-semibold text-green-600">{stats.conversionRate}%</span>
            <span className="text-gray-400">| {stats.testRidesThisMonth} test rides</span>
          </div>
        </div>
      </div>

      {/* Row 3: Tables - 3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {/* Recent Services */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
              <Wrench size={12} className="text-blue-600" /> Services
            </h3>
            <button className="text-[11px] text-green-600 hover:text-green-700">All →</button>
          </div>
          <table className="w-full text-[11px]">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-3 py-1.5 text-left">Vehicle</th>
                <th className="px-3 py-1.5 text-left">Type</th>
                <th className="px-3 py-1.5 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentServices.length > 0 ? recentServices.map(s => (
                <tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-1.5 text-gray-800">{s._vehicle?.registration_number || s._vehicle?.vehicle_model_id?.slice(0,8) || 'N/A'}</td>
                  <td className="px-3 py-1.5 text-gray-600">{s.service_type?.replace('_', ' ') || 'General'}</td>
                  <td className="px-3 py-1.5">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColors[s.status] || 'bg-gray-100'}`}>{s.status}</span>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={3} className="px-3 py-4 text-center text-gray-400">No services</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Recent Sales */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
              <ShoppingCart size={12} className="text-green-600" /> Sales
            </h3>
            <button className="text-[11px] text-green-600 hover:text-green-700">All →</button>
          </div>
          <table className="w-full text-[11px]">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-3 py-1.5 text-left">Invoice</th>
                <th className="px-3 py-1.5 text-left">Customer</th>
                <th className="px-3 py-1.5 text-left">Amount</th>
                <th className="px-3 py-1.5 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentSales.length > 0 ? recentSales.map(s => (
                <tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-1.5 font-mono text-[10px]">{s.invoice_number || `INV-${s.id.slice(0,6)}`}</td>
                  <td className="px-3 py-1.5 text-gray-800">{s._customer?.first_name || 'Walk-in'}</td>
                  <td className="px-3 py-1.5 text-gray-800 font-medium">{formatCurrency(s.ex_showroom_price)}</td>
                  <td className="px-3 py-1.5">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${paymentColors[s.payment_status] || 'bg-gray-100'}`}>{s.payment_status}</span>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="px-3 py-4 text-center text-gray-400">No sales</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Upcoming Appointments */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
              <Calendar size={12} className="text-purple-600" /> Appointments
            </h3>
            <button className="text-[11px] text-green-600 hover:text-green-700">All →</button>
          </div>
          <table className="w-full text-[11px]">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-3 py-1.5 text-left">Date</th>
                <th className="px-3 py-1.5 text-left">Customer</th>
                <th className="px-3 py-1.5 text-left">Type</th>
              </tr>
            </thead>
            <tbody>
              {upcomingAppointments.length > 0 ? upcomingAppointments.map(a => (
                <tr key={a.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-1.5">
                    <div className="text-gray-800">{new Date(a.appointment_date).toLocaleDateString('en-US', {month:'short', day:'numeric'})}</div>
                    <div className="text-[10px] text-gray-400">{a.appointment_time?.slice(0,5)}</div>
                  </td>
                  <td className="px-3 py-1.5 text-gray-800">{a._customer?.first_name || 'N/A'}</td>
                  <td className="px-3 py-1.5 text-gray-600">{a.service_type || 'Service'}</td>
                </tr>
              )) : (
                <tr><td colSpan={3} className="px-3 py-4 text-center text-gray-400">No appointments</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}