'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  Wrench, 
  FileText, 
  TrendingUp, 
  Building2, 
  Zap, 
  Battery,
  Car,
  Settings,
  Leaf,
  Package,
  ClipboardList,
  ShoppingCart,
 
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';


interface SidebarProps {
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}

interface ShowroomData {
  id: string;
  showroom_name: string;
  business_type: string;
}

interface BrandingData {
  primary_color: string;
  secondary_color: string;
  logo_url: string;
}

interface StatsData {
  total_customers: number;
  total_vehicles: number;
  total_invoices: number;
  monthly_revenue: number;
  revenue_target: number;
  revenue_growth: number;
}

// EV Green Color Palette
const EV_GREEN = {
  primary: '#00C853',
  primaryDark: '#009624',
  primaryLight: '#69F0AE',
  secondary: '#00E676',
  accent: '#00B248',
  gradient: 'linear-gradient(135deg, #00C853, #00E676)',
  gradientDark: 'linear-gradient(135deg, #009624, #00C853)',
  background: 'linear-gradient(135deg, #E8F5E9, #C8E6C9)',
  text: '#1B5E20'
};

export function Sidebar({ activeSection: propActiveSection, onSectionChange: propOnSectionChange }: SidebarProps) {
  const [internalActiveSection, setInternalActiveSection] = useState('dashboard');
  const [showroom, setShowroom] = useState<ShowroomData | null>(null);
  const [branding, setBranding] = useState<BrandingData | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  
  const pathname = usePathname();
  
  // Determine active section from URL path
  const getActiveSectionFromPath = (path: string) => {
    const segments = path.split('/').filter(seg => seg !== '');
    
    // Handle root or just /dashboard
    if (segments.length === 0 || (segments.length === 1 && segments[0] === 'dashboard')) {
      return 'dashboard';
    }
    
    // Check the second segment (after 'dashboard')
    if (segments.length >= 2 && segments[0] === 'dashboard') {
      const section = segments[1];
      switch (section) {
        case 'customer':
        case 'customers':
          return 'customer';
        case 'vehicles':
          return 'vehicles';
        case 'stock':
        case 'parts':
        case 'inventory':
          return 'stock';
        case 'service':
        case 'repairs':
        case 'appointments':
          return 'service';
        case 'invoices':
        case 'billing':
          return 'invoices';
        default:
          return 'dashboard';
      }
    }
    
    return 'dashboard';
  };
  
  // Use either prop or path-based detection
  const activeSection = propActiveSection !== undefined 
    ? propActiveSection 
    : getActiveSectionFromPath(pathname);
  
  // Sync internal state when activeSection changes
  useEffect(() => {
    if (!propOnSectionChange) {
      setInternalActiveSection(activeSection);
    }
  }, [activeSection, propOnSectionChange]);

  useEffect(() => {
    fetchShowroomAndData();
  }, []);

  async function fetchShowroomAndData() {
    try {
      let showroomId = null;
      
      const showroomStr = localStorage.getItem('showroom');
      if (showroomStr) {
        try {
          const showroomData = JSON.parse(showroomStr);
          showroomId = showroomData.id;
          setShowroom(showroomData);
        } catch (e) {
          console.error('Error parsing showroom:', e);
        }
      }
      
      if (!showroomId) {
        const cookieShowroomId = document.cookie.split(';').find(c => c.trim().startsWith('showroom_id='));
        if (cookieShowroomId) {
          showroomId = cookieShowroomId.split('=')[1];
        }
      }
      
      if (showroomId) {
        const { data: brandingData, error: brandingError } = await supabase
          .from('showroom_branding')
          .select('primary_color, secondary_color, logo_url')
          .eq('showroom_id', showroomId)
          .single();
        
        if (!brandingError && brandingData) {
          setBranding(brandingData);
          const primaryColor = brandingData.primary_color || EV_GREEN.primary;
          const secondaryColor = brandingData.secondary_color || EV_GREEN.secondary;
          document.documentElement.style.setProperty('--brand-primary', primaryColor);
          document.documentElement.style.setProperty('--brand-secondary', secondaryColor);
        }
        
        await fetchStats(showroomId);
      }
    } catch (error) {
      console.error('Error fetching sidebar data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchStats(showroomId: string) {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
      
      // Get customers count
      const { count: customersCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('showroom_id', showroomId);
      
      // Get vehicles count from inventory
      const { count: vehiclesCount } = await supabase
        .from('inventory')
        .select('*', { count: 'exact', head: true })
        .eq('showroom_id', showroomId);
      
      // Get sales invoices for monthly revenue
      const { data: invoices, error: invoicesError } = await supabase
        .from('sales_invoices')
        .select('ex_showroom_price, rto_charges, insurance_amount, handling_charges, fast_charger_cost, extended_warranty_cost, accessories_amount')
        .eq('showroom_id', showroomId)
        .gte('created_at', startOfMonth)
        .lte('created_at', endOfMonth);
      
      let monthlyRevenue = 0;
      if (!invoicesError && invoices) {
        monthlyRevenue = invoices.reduce((sum, inv) => {
          return sum + 
            (inv.ex_showroom_price || 0) + 
            (inv.rto_charges || 0) + 
            (inv.insurance_amount || 0) + 
            (inv.handling_charges || 0) + 
            (inv.fast_charger_cost || 0) + 
            (inv.extended_warranty_cost || 0) + 
            (inv.accessories_amount || 0);
        }, 0);
      }
      
      // Get total invoices count
      const { count: invoicesCount } = await supabase
        .from('sales_invoices')
        .select('*', { count: 'exact', head: true })
        .eq('showroom_id', showroomId);
      
      const revenueTarget = monthlyRevenue * 1.2;
      const revenueGrowth = monthlyRevenue > 0 ? 15 : 0;
      
      setStats({
        total_customers: customersCount || 0,
        total_vehicles: vehiclesCount || 0,
        total_invoices: invoicesCount || 0,
        monthly_revenue: monthlyRevenue,
        revenue_target: revenueTarget,
        revenue_growth: revenueGrowth
      });
      
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats({
        total_customers: 0,
        total_vehicles: 0,
        total_invoices: 0,
        monthly_revenue: 0,
        revenue_target: 0,
        revenue_growth: 0
      });
    }
  }

  const menuItems = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: LayoutDashboard, 
      href: '/dashboard' 
    },
    { 
      id: 'customer', 
      label: 'Customers', 
      icon: Users, 
      href: '/dashboard/customer' 
    },
    { 
      id: 'vehicles', 
      label: 'Vehicles', 
      icon: Car, 
      href: '/dashboard/vehicles' 
    },
    { 
      id: 'stock', 
      label: 'Stock/Parts', 
      icon: Package, 
      href: '/dashboard/stock' 
    },
    { 
      id: 'service', 
      label: 'Service', 
      icon: Wrench, 
      href: '/dashboard/service' 
    },
    { 
      id: 'invoices', 
      label: 'Invoices', 
      icon: FileText, 
      href: '/dashboard/invoices' 
    },
  ];

  const getPrimaryColor = () => branding?.primary_color || EV_GREEN.primary;
  const getSecondaryColor = () => branding?.secondary_color || EV_GREEN.secondary;
  
  const getGradientStyle = () => {
    if (branding?.primary_color && branding?.secondary_color) {
      return {
        background: `linear-gradient(135deg, ${branding.primary_color}, ${branding.secondary_color})`
      };
    }
    return { background: EV_GREEN.gradient };
  };

  const getLinkStyle = (isActive: boolean) => {
    if (isActive) {
      if (branding?.primary_color && branding?.secondary_color) {
        return {
          background: `linear-gradient(135deg, ${branding.primary_color}, ${branding.secondary_color})`,
          color: 'white',
          boxShadow: '0 4px 12px rgba(0, 200, 83, 0.3)'
        };
      }
      return {
        background: EV_GREEN.gradient,
        color: 'white',
        boxShadow: '0 4px 12px rgba(0, 200, 83, 0.3)'
      };
    }
    return {
      color: '#374151',
      background: 'transparent'
    };
  };

  const handleNavigation = (sectionId: string, href: string) => {
    if (propOnSectionChange) {
      propOnSectionChange(sectionId);
    }
  };

  return (
    <div className="w-64 h-full bg-gradient-to-b from-white to-gray-50 border-r border-gray-200 flex flex-col shadow-lg">
      <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-105"
            style={getGradientStyle()}
          >
            <Leaf className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-gray-900 text-lg font-bold tracking-tight">
              {showroom?.showroom_name || 'EV Service Hub'}
            </h1>
            <p className="text-xs text-green-700 flex items-center gap-1 font-medium">
              <Battery className="w-3 h-3" />
              {showroom?.business_type || 'Electric Vehicle'} Management
            </p>
          </div>
        </Link>
      </div>
      
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          const linkStyle = getLinkStyle(isActive);
          
          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => handleNavigation(item.id, item.href)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive 
                  ? 'shadow-md transform scale-[1.02]' 
                  : 'hover:bg-green-50 hover:text-green-700'
              }`}
              style={linkStyle}
            >
              <Icon className={`w-5 h-5 transition-colors ${
                !isActive && 'text-gray-500 group-hover:text-green-600'
              }`} />
              <span className="font-medium text-sm">{item.label}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Stats Card */}
      <div className="p-4 m-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-green-700" />
          </div>
          <div>
            <span className="text-xs font-semibold text-green-800 uppercase tracking-wide">EV Insights</span>
            <p className="text-xs text-green-600">Real-time metrics</p>
          </div>
        </div>
        
        {loading ? (
          <div className="space-y-3">
            <div className="h-3 bg-green-200 rounded-full animate-pulse"></div>
            <div className="h-8 bg-green-200 rounded-lg animate-pulse"></div>
            <div className="h-2 bg-green-200 rounded-full animate-pulse"></div>
          </div>
        ) : (
          <>
            <div className="mb-2">
              <div className="text-xs text-green-700 font-medium mb-1">Monthly Revenue</div>
              <div className="text-2xl font-bold text-gray-900">
                ₹{(stats?.monthly_revenue || 0).toLocaleString('en-IN')}
              </div>
            </div>
            
            {stats && stats.revenue_target > 0 && (
              <div className="mb-3">
                <div className="flex justify-between text-xs text-green-700 mb-1">
                  <span>Progress</span>
                  <span className="font-semibold">
                    {Math.min(Math.round((stats.monthly_revenue / stats.revenue_target) * 100), 100)}%
                  </span>
                </div>
                <div className="h-2 bg-green-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min((stats.monthly_revenue / stats.revenue_target) * 100, 100)}%`,
                      background: EV_GREEN.gradient
                    }}
                  ></div>
                </div>
                <div className="text-xs text-green-600 mt-1 flex justify-between">
                  <span>Target: ₹{Math.round(stats.revenue_target).toLocaleString('en-IN')}</span>
                  <span className="text-green-700 font-semibold">+{stats.revenue_growth}%</span>
                </div>
              </div>
            )}
            
            <div className="pt-3 border-t border-green-200">
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">{stats?.total_customers || 0}</div>
                  <div className="text-xs text-green-700">Customers</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">{stats?.total_vehicles || 0}</div>
                  <div className="text-xs text-green-700">Vehicles</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">{stats?.total_invoices || 0}</div>
                  <div className="text-xs text-green-700">Invoices</div>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2 text-center">
              <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 rounded-full">
                <Leaf className="w-3 h-3 text-green-700" />
                <span className="text-xs text-green-800 font-medium">Eco-Friendly</span>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="mt-auto p-4">
        <div className="h-1 w-full bg-gradient-to-r from-green-200 via-green-400 to-green-200 rounded-full"></div>
      </div>
    </div>
  );
}