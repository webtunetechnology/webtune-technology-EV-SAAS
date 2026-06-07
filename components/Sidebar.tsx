'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  Car, 
  Package, 
  FileText, 
  Wrench, 
  Boxes,
  Leaf,
  Battery,
  Store
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
  logo_url?: string;
}

interface BrandingData {
  primary_color: string;
  secondary_color: string;
  logo_url: string;
}

// Modern EV Color Palette
const EV_COLORS = {
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
  const [showroom, setShowroom] = useState<ShowroomData | null>(null);
  const [branding, setBranding] = useState<BrandingData | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  
  const pathname = usePathname();
  
  // Determine active section from URL path
  const getActiveSectionFromPath = (path: string) => {
    const segments = path.split('/').filter(seg => seg !== '');
    
    if (segments.length === 0 || (segments.length === 1 && segments[0] === 'dashboard')) {
      return 'dashboard';
    }
    
    if (segments.length >= 2 && segments[0] === 'dashboard') {
      const section = segments[1];
      return section;
    }
    
    return 'dashboard';
  };
  
  const activeSection = propActiveSection !== undefined 
    ? propActiveSection 
    : getActiveSectionFromPath(pathname);

  useEffect(() => {
    fetchShowroomAndData();
  }, []);

  // Function to get logo from various sources
  const getLogoFromStorage = (): string | null => {
    // Check localStorage first
    const localStorageLogo = localStorage.getItem('showroom_logo');
    if (localStorageLogo && localStorageLogo !== 'null' && localStorageLogo !== 'undefined') {
      return localStorageLogo;
    }
    
    // Check sessionStorage
    const sessionStorageLogo = sessionStorage.getItem('showroom_logo');
    if (sessionStorageLogo && sessionStorageLogo !== 'null' && sessionStorageLogo !== 'undefined') {
      return sessionStorageLogo;
    }
    
    // Check cookies
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'showroom_logo' && value && value !== 'null' && value !== 'undefined') {
        return decodeURIComponent(value);
      }
    }
    
    return null;
  };

  async function fetchShowroomAndData() {
    try {
      let showroomId = null;
      let showroomDataFromStorage = null;
      
      // First, try to get logo from storage
      const storedLogo = getLogoFromStorage();
      if (storedLogo) {
        setLogoUrl(storedLogo);
      }
      
      // Get showroom data from localStorage
      const showroomStr = localStorage.getItem('showroom');
      if (showroomStr) {
        try {
          showroomDataFromStorage = JSON.parse(showroomStr);
          showroomId = showroomDataFromStorage.id;
          setShowroom(showroomDataFromStorage);
          
          // If logo is in showroom data, use it
          if (showroomDataFromStorage.logo_url) {
            setLogoUrl(showroomDataFromStorage.logo_url);
          }
        } catch (e) {
          console.error('Error parsing showroom:', e);
        }
      }
      
      // If no showroomId, try cookies
      if (!showroomId) {
        const cookieShowroomId = document.cookie.split(';').find(c => c.trim().startsWith('showroom_id='));
        if (cookieShowroomId) {
          showroomId = cookieShowroomId.split('=')[1];
          
          // Try to get showroom name from cookie
          const cookieShowroomName = document.cookie.split(';').find(c => c.trim().startsWith('showroom_name='));
          if (cookieShowroomName) {
            const showroomName = cookieShowroomName.split('=')[1];
            setShowroom({
              id: showroomId,
              showroom_name: decodeURIComponent(showroomName),
              business_type: ''
            });
          }
        }
      }
      
      if (showroomId) {
        // Fetch branding data from database
        const { data: brandingData, error: brandingError } = await supabase
          .from('showroom_branding')
          .select('primary_color, secondary_color, logo_url')
          .eq('showroom_id', showroomId)
          .single();
        
        if (!brandingError && brandingData) {
          setBranding(brandingData);
          
          // Set logo from branding if available
          if (brandingData.logo_url) {
            setLogoUrl(brandingData.logo_url);
            // Store logo in localStorage for future use
            localStorage.setItem('showroom_logo', brandingData.logo_url);
          }
          
          const primaryColor = brandingData.primary_color || EV_COLORS.primary;
          const secondaryColor = brandingData.secondary_color || EV_COLORS.secondary;
          document.documentElement.style.setProperty('--brand-primary', primaryColor);
          document.documentElement.style.setProperty('--brand-secondary', secondaryColor);
        }
      }
    } catch (error) {
      console.error('Error fetching sidebar data:', error);
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
      id: 'vehicle', 
      label: 'Vehicles', 
      icon: Car, 
      href: '/dashboard/vehicle'
    },
    { 
      id: 'inventory', 
      label: 'Inventory', 
      icon: Package, 
      href: '/dashboard/inventory'
    },
    { 
      id: 'invoice', 
      label: 'Invoices', 
      icon: FileText, 
      href: '/dashboard/invoice'
    },
    { 
      id: 'service', 
      label: 'Service', 
      icon: Wrench, 
      href: '/dashboard/service'
    },
    { 
      id: 'stock', 
      label: 'Stock', 
      icon: Boxes, 
      href: '/dashboard/stock'
    },
  ];

  const getPrimaryColor = () => branding?.primary_color || EV_COLORS.primary;
  
  const getGradientStyle = () => {
    if (branding?.primary_color && branding?.secondary_color) {
      return {
        background: `linear-gradient(135deg, ${branding.primary_color}, ${branding.secondary_color})`
      };
    }
    return { background: EV_COLORS.gradient };
  };

  const getLinkStyle = (isActive: boolean) => {
    if (isActive) {
      if (branding?.primary_color && branding?.secondary_color) {
        return {
          background: `linear-gradient(135deg, ${branding.primary_color}15, ${branding.secondary_color}10)`,
          color: getPrimaryColor(),
          borderLeft: `3px solid ${getPrimaryColor()}`,
          fontWeight: '600'
        };
      }
      return {
        background: `linear-gradient(135deg, ${EV_COLORS.primary}15, ${EV_COLORS.secondary}10)`,
        color: EV_COLORS.primary,
        borderLeft: `3px solid ${EV_COLORS.primary}`,
        fontWeight: '600'
      };
    }
    return {
      color: '#6B7280',
      background: 'transparent',
      fontWeight: '500'
    };
  };

  const handleNavigation = (sectionId: string, href: string) => {
    if (propOnSectionChange) {
      propOnSectionChange(sectionId);
    }
  };

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 flex flex-col shadow-lg z-50">
      {/* Header with Logo */}
      <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <Link href="/dashboard" className="flex items-center gap-3">
          {/* Logo Section */}
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md transition-all duration-300 hover:scale-105 flex-shrink-0 overflow-hidden"
            style={logoUrl ? { background: 'transparent' } : getGradientStyle()}
          >
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt={showroom?.showroom_name || 'Showroom Logo'}
                className="w-full h-full object-cover rounded-xl"
                onError={(e) => {
                  // If image fails to load, fallback to icon
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    parent.style.background = getGradientStyle().background;
                    const icon = document.createElement('div');
                    icon.innerHTML = '<svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>';
                    parent.appendChild(icon);
                  }
                }}
              />
            ) : (
              <Store className="w-5 h-5 text-white" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h1 className="text-gray-900 text-base font-bold truncate">
              {showroom?.showroom_name || 'EV Showroom'}
            </h1>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Battery className="w-3 h-3" />
              Management System
            </p>
          </div>
        </Link>
      </div>
      
      {/* Navigation */}
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
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                isActive ? 'shadow-sm' : 'hover:bg-gray-50'
              }`}
              style={linkStyle}
            >
              <Icon className={`w-5 h-5 transition-colors ${!isActive ? 'text-gray-400 group-hover:text-gray-600' : ''}`} />
              <span className="text-sm font-medium">{item.label}</span>
              {isActive && (
                <div 
                  className="ml-auto w-1.5 h-1.5 rounded-full"
                  style={{ background: getPrimaryColor() }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4">
        <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-gray-200 to-transparent rounded-full"></div>
        <div className="mt-3 text-center">
          <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 rounded-full">
            <Leaf className="w-3 h-3 text-green-600" />
            <span className="text-xs text-green-700 font-medium">Eco-Friendly</span>
          </div>
        </div>
      </div>
    </div>
  );
}