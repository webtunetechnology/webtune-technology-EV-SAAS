'use client';

import { useState, useEffect } from 'react';
import {
  ShoppingBag, IndianRupee, Users, TrendingUp, ClipboardList,
  RefreshCw, ArrowUpRight, Car
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DailyRevenue {
  label: string;       // "28 Jun"
  date: string;        // ISO date string for comparison
  revenue: number;
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

interface TopVehicle {
  vehicle_id: string;
  label: string;
  units: number;
  revenue: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  if (amount >= 10_000_000) return `₹${(amount / 10_000_000).toFixed(1)}Cr`;
  if (amount >= 100_000) return `₹${(amount / 100_000).toFixed(1)}L`;
  if (amount >= 1_000) return `₹${amount.toLocaleString('en-IN')}`;
  return `₹${amount}`;
}

function formatCurrencyShort(amount: number): string {
  if (amount >= 100_000) return `₹${(amount / 100_000).toFixed(0)}L`;
  if (amount >= 1_000) return `₹${(amount / 1_000).toFixed(0)}K`;
  return `₹${amount}`;
}

const STATUS_BADGE: Record<string, string> = {
  Paid:      'bg-green-100 text-green-700',
  Pending:   'bg-violet-100 text-violet-600',
  Partial:   'bg-blue-100 text-blue-700',
  Financed:  'bg-amber-100 text-amber-700',
};

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  change: string;
  positive: boolean;
  loading?: boolean;
}

function StatCard({ title, value, icon: Icon, change, positive, loading }: StatCardProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
        <div className="flex justify-between items-start">
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-stone-200 rounded w-24 animate-pulse" />
            <div className="h-7 bg-stone-200 rounded w-32 animate-pulse" />
            <div className="h-3 bg-stone-200 rounded w-20 animate-pulse" />
          </div>
          <div className="h-10 w-10 bg-stone-100 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <p className="text-sm text-stone-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-stone-900 mt-1 leading-none">{value}</p>
          <p className={`text-xs mt-2 font-medium ${positive ? 'text-emerald-600' : 'text-red-500'}`}>
            {change}
          </p>
        </div>
        <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-orange-50 flex-shrink-0 ml-3">
          <Icon size={20} className="text-orange-500" />
        </div>
      </div>
    </div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-stone-200 rounded-xl px-3 py-2 shadow-lg text-sm">
        <p className="text-stone-500 text-xs mb-0.5">{label}</p>
        <p className="font-bold text-stone-900">{formatCurrency(payload[0].value)}</p>
      </div>
    );
  }
  return null;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');
  const [dateRange, setDateRange] = useState('');

  const [stats, setStats] = useState({
    totalOrders: 0,
    totalSales: 0,
    totalCustomers: 0,
    grossProfit: 0,
    avgOrderValue: 0,
    ordersChange: '+0%',
    salesChange: '+0%',
    customersChange: '+0%',
    profitChange: '+0%',
    avgOrderChange: '+0%',
  });

  const [chartData, setChartData] = useState<DailyRevenue[]>([]);
  const [recentOrders, setRecentOrders] = useState<SalesInvoice[]>([]);
  const [topVehicles, setTopVehicles] = useState<TopVehicle[]>([]);

  useEffect(() => {
    // Set date range display (last 7 days)
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 6);

    const fmtShort = (d: Date) =>
      d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    setDateRange(`${fmtShort(sevenDaysAgo)} – ${fmtShort(now)}`);

    const fmtTime = (d: Date) =>
      d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    setLastUpdated(`Last: ${fmtTime(now)}`);

    loadData();
  }, []);

  async function loadData() {
    try {
      const showroomStr = localStorage.getItem('showroom');
      let sId: string | null = null;
      if (showroomStr) {
        try { sId = JSON.parse(showroomStr).id; } catch (_) {}
      }
      if (!sId) {
        const c = document.cookie.split(';').find(x => x.trim().startsWith('showroom_id='));
        if (c) sId = c.split('=')[1];
      }
      if (sId) await fetchStats(sId);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchStats(showroomId: string) {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const prevStart = new Date(sevenDaysAgo);
    prevStart.setDate(prevStart.getDate() - 7);
    const prevEnd = new Date(sevenDaysAgo);

    const [salesRes, customersRes, inventoryRes] = await Promise.all([
      supabase
        .from('sales_invoices')
        .select('id, invoice_number, payment_status, ex_showroom_price, created_at, customer_id, inventory_id')
        .eq('showroom_id', showroomId)
        .eq('is_cancelled', false)
        .order('created_at', { ascending: false }),
      supabase
        .from('customers')
        .select('id, customer_status, created_at')
        .eq('showroom_id', showroomId)
        .is('deleted_at', null),
      supabase
        .from('inventory')
        .select('id, vehicles(model_name, brands(brand_name))')
        .eq('showroom_id', showroomId),
    ]);

    const sales: any[] = salesRes.data || [];
    const customers: any[] = customersRes.data || [];
    const inventoryItems: any[] = inventoryRes.data || [];

    // Build inventory lookup
    const invMap: Record<string, string> = {};
    for (const item of inventoryItems) {
      const brand = item.vehicles?.brands?.brand_name || '';
      const model = item.vehicles?.model_name || '';
      invMap[item.id] = `${brand} ${model}`.trim() || 'Unknown';
    }

    // Filter to last 7 days
    const recentSales = sales.filter(s => s.created_at && new Date(s.created_at) >= sevenDaysAgo);
    const prevSales = sales.filter(s => {
      if (!s.created_at) return false;
      const d = new Date(s.created_at);
      return d >= prevStart && d < prevEnd;
    });
    const recentCustomers = customers.filter(c => c.created_at && new Date(c.created_at) >= sevenDaysAgo);
    const prevCustomers = customers.filter(c => {
      if (!c.created_at) return false;
      const d = new Date(c.created_at);
      return d >= prevStart && d < prevEnd;
    });

    const totalOrders = recentSales.length;
    const totalSales = recentSales.reduce((s: number, x: any) => s + (x.ex_showroom_price || 0), 0);
    const totalCustomers = recentCustomers.length;
    // Approx gross profit as 10% margin on sales
    const grossProfit = Math.round(totalSales * 0.1);
    const avgOrderValue = totalOrders > 0 ? Math.round(totalSales / totalOrders) : 0;

    const prevOrders = prevSales.length;
    const prevSalesTotal = prevSales.reduce((s: number, x: any) => s + (x.ex_showroom_price || 0), 0);
    const prevCustomersCount = prevCustomers.length;

    const pct = (curr: number, prev: number) => {
      if (prev === 0 && curr === 0) return '+0% vs last 7 days';
      if (prev === 0) return `+100% vs last 7 days`;
      const p = Math.round(((curr - prev) / prev) * 100);
      return `${p >= 0 ? '+' : ''}${p}% vs last 7 days`;
    };

    setStats({
      totalOrders,
      totalSales,
      totalCustomers,
      grossProfit,
      avgOrderValue,
      ordersChange: pct(totalOrders, prevOrders),
      salesChange: pct(totalSales, prevSalesTotal),
      customersChange: pct(totalCustomers, prevCustomersCount),
      profitChange: pct(grossProfit, Math.round(prevSalesTotal * 0.1)),
      avgOrderChange: pct(
        prevOrders > 0 ? Math.round(prevSalesTotal / prevOrders) : 0,
        prevOrders > 0 ? Math.round(prevSalesTotal / prevOrders) : 0
      ),
    });

    // Build chart data — last 7 days
    const daily: DailyRevenue[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(now.getDate() - i);
      day.setHours(0, 0, 0, 0);
      const next = new Date(day);
      next.setDate(day.getDate() + 1);

      const rev = sales
        .filter(s => {
          if (!s.created_at) return false;
          const d = new Date(s.created_at);
          return d >= day && d < next;
        })
        .reduce((sum: number, s: any) => sum + (s.ex_showroom_price || 0), 0);

      daily.push({
        label: day.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        date: day.toISOString(),
        revenue: rev,
      });
    }
    setChartData(daily);

    // Top vehicles from recent sales
    const vehicleCount: Record<string, { units: number; revenue: number; label: string }> = {};
    for (const s of recentSales) {
      const key = s.inventory_id || 'unknown';
      const label = invMap[s.inventory_id] || 'EV Model';
      if (!vehicleCount[key]) vehicleCount[key] = { units: 0, revenue: 0, label };
      vehicleCount[key].units += 1;
      vehicleCount[key].revenue += s.ex_showroom_price || 0;
    }
    const top = Object.entries(vehicleCount)
      .map(([id, v]) => ({ vehicle_id: id, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
    setTopVehicles(top);

    // Fetch customer names for recent orders
    const orders = sales.slice(0, 8);
    if (orders.length > 0) {
      const custIds = [...new Set(orders.map((s: any) => s.customer_id))];
      const { data: custs } = await supabase
        .from('customers')
        .select('id, first_name, last_name')
        .in('id', custIds);
      const custMap = Object.fromEntries((custs || []).map((c: any) => [c.id, c]));
      orders.forEach((o: any) => { o._customer = custMap[o.customer_id] || null; });
    }
    setRecentOrders(orders);
  }

  const isPositive = (s: string) => !s.startsWith('-');

  return (
    <div className="min-h-full bg-stone-50 p-6 space-y-6">

      {/* ── Header Row ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Welcome back, Admin!</h1>
          <p className="text-sm text-stone-500 mt-0.5">{"Here's what's happening with your showroom today."}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 px-3.5 py-2 bg-white border border-stone-200 rounded-xl text-sm text-stone-700 shadow-sm font-medium">
            {dateRange}
          </div>
          <button
            onClick={() => { setLoading(true); loadData(); }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-stone-200 rounded-xl text-sm text-stone-600 shadow-sm hover:bg-stone-50 transition-colors font-medium"
          >
            <RefreshCw size={13} />
            {lastUpdated}
          </button>
        </div>
      </div>

      {/* ── Stat Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Orders"
          value={String(stats.totalOrders)}
          icon={ShoppingBag}
          change={stats.ordersChange}
          positive={isPositive(stats.ordersChange)}
          loading={loading}
        />
        <StatCard
          title="Total Sales"
          value={formatCurrency(stats.totalSales)}
          icon={IndianRupee}
          change={stats.salesChange}
          positive={isPositive(stats.salesChange)}
          loading={loading}
        />
        <StatCard
          title="Total Customers"
          value={String(stats.totalCustomers)}
          icon={Users}
          change={stats.customersChange}
          positive={isPositive(stats.customersChange)}
          loading={loading}
        />
        <StatCard
          title="Gross Profit"
          value={formatCurrency(stats.grossProfit)}
          icon={TrendingUp}
          change={stats.profitChange}
          positive={isPositive(stats.profitChange)}
          loading={loading}
        />
        <StatCard
          title="Avg. Order Value"
          value={stats.avgOrderValue > 0 ? formatCurrency(stats.avgOrderValue) : '₹0'}
          icon={ClipboardList}
          change={stats.avgOrderChange}
          positive={isPositive(stats.avgOrderChange)}
          loading={loading}
        />
      </div>

      {/* ── Main Content Row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px_300px] gap-4">

        {/* Sales Overview Chart */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h2 className="text-base font-bold text-stone-900">Sales Overview</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-2xl font-bold text-stone-900">{formatCurrency(stats.totalSales)}</span>
                {stats.salesChange !== '+0% vs last 7 days' && (
                  <span className={`text-xs font-semibold flex items-center gap-0.5 ${isPositive(stats.salesChange) ? 'text-emerald-600' : 'text-red-500'}`}>
                    <ArrowUpRight size={12} />
                    {stats.salesChange}
                  </span>
                )}
              </div>
            </div>
            <span className="px-3 py-1.5 bg-stone-100 rounded-xl text-xs font-medium text-stone-600 border border-stone-200">
              This Week
            </span>
          </div>

          {loading ? (
            <div className="h-52 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="mt-4 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#a8a29e' }}
                    axisLine={false}
                    tickLine={false}
                    dy={6}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#a8a29e' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={formatCurrencyShort}
                    width={40}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#c2410c"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#c2410c', strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: '#c2410c', strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Top Selling Vehicles */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-stone-900">Top Selling Vehicles</h2>
            <Link href="/dashboard/inventory" className="text-sm font-semibold text-orange-600 hover:text-orange-700 transition-colors">
              View All
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-stone-100 rounded-xl animate-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-stone-100 rounded w-32 animate-pulse" />
                    <div className="h-2.5 bg-stone-100 rounded w-20 animate-pulse" />
                  </div>
                  <div className="h-3 bg-stone-100 rounded w-14 animate-pulse" />
                </div>
              ))}
            </div>
          ) : topVehicles.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-stone-400">
              <Car size={32} className="mb-2 opacity-40" />
              <p className="text-sm">No sales data yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topVehicles.map((v, i) => (
                <div key={v.vehicle_id} className="flex items-center gap-3 py-1">
                  <div className="h-10 w-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center flex-shrink-0">
                    <Car size={18} className="text-orange-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-stone-800 truncate">{v.label}</p>
                    <p className="text-xs text-stone-400">{v.units} unit{v.units !== 1 ? 's' : ''} sold</p>
                  </div>
                  <span className="text-sm font-bold text-stone-900 flex-shrink-0">
                    {formatCurrency(v.revenue)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-stone-900">Recent Orders</h2>
            <Link href="/dashboard/invoice" className="text-sm font-semibold text-orange-600 hover:text-orange-700 transition-colors">
              View All
            </Link>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between">
                    <div className="h-3 bg-stone-100 rounded w-24 animate-pulse" />
                    <div className="h-3 bg-stone-100 rounded w-14 animate-pulse" />
                  </div>
                  <div className="flex justify-between">
                    <div className="h-2.5 bg-stone-100 rounded w-20 animate-pulse" />
                    <div className="h-5 bg-stone-100 rounded-full w-20 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-stone-400">
              <ClipboardList size={32} className="mb-2 opacity-40" />
              <p className="text-sm">No orders yet</p>
            </div>
          ) : (
            <div className="space-y-0 divide-y divide-stone-100">
              {recentOrders.map((order) => (
                <div key={order.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-stone-800 font-mono">
                        {order.invoice_number || `#INV-${order.id.slice(0, 6).toUpperCase()}`}
                      </p>
                      <p className="text-xs text-stone-400 mt-0.5 truncate">
                        {order._customer
                          ? `${order._customer.first_name} ${order._customer.last_name}`
                          : 'Walk-in Customer'}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-sm font-bold text-stone-900">
                        {formatCurrency(order.ex_showroom_price)}
                      </span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${STATUS_BADGE[order.payment_status] || 'bg-stone-100 text-stone-600'}`}>
                        {order.payment_status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
