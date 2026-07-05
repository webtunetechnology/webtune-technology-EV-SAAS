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
  Store,
  Crown,
  ChevronLeft,
  LogOut,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

interface SidebarProps {
  activeSection?: string;
  onSectionChange?: (section: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onClose?: () => void;
}

interface ShowroomData {
  id: string;
  showroom_name: string;
  business_type: string;
  logo_url?: string;
}

// Accent used for the active/selected state (matches the reference UI).
const ACCENT = '#C15F3C';
const ACCENT_SOFT = '#F8E7DC';

type MenuItem = {
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
  href: string;
  badge?: number;
};

export function Sidebar({
  activeSection: propActiveSection,
  collapsed = false,
  onToggleCollapse,
  onClose,
}: SidebarProps) {
  const [showroom, setShowroom] = useState<ShowroomData | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const pathname = usePathname();

  // Determine active section from URL path
  const getActiveSectionFromPath = (path: string) => {
    const segments = path.split('/').filter((seg) => seg !== '');
    if (segments.length === 0 || (segments.length === 1 && segments[0] === 'dashboard')) {
      return 'dashboard';
    }
    if (segments.length >= 2 && segments[0] === 'dashboard') {
      return segments[1];
    }
    return 'dashboard';
  };

  const activeSection =
    propActiveSection !== undefined ? propActiveSection : getActiveSectionFromPath(pathname);

  useEffect(() => {
    fetchShowroomAndData();
  }, []);

  const getLogoFromStorage = (): string | null => {
    const localStorageLogo = localStorage.getItem('showroom_logo');
    if (localStorageLogo && localStorageLogo !== 'null' && localStorageLogo !== 'undefined') {
      return localStorageLogo;
    }
    const sessionStorageLogo = sessionStorage.getItem('showroom_logo');
    if (sessionStorageLogo && sessionStorageLogo !== 'null' && sessionStorageLogo !== 'undefined') {
      return sessionStorageLogo;
    }
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

      const storedLogo = getLogoFromStorage();
      if (storedLogo) setLogoUrl(storedLogo);

      const showroomStr = localStorage.getItem('showroom');
      if (showroomStr) {
        try {
          const showroomDataFromStorage = JSON.parse(showroomStr);
          showroomId = showroomDataFromStorage.id;
          setShowroom(showroomDataFromStorage);
          if (showroomDataFromStorage.logo_url) setLogoUrl(showroomDataFromStorage.logo_url);
        } catch (e) {
          console.error('Error parsing showroom:', e);
        }
      }

      if (!showroomId) {
        const cookieShowroomId = document.cookie
          .split(';')
          .find((c) => c.trim().startsWith('showroom_id='));
        if (cookieShowroomId) {
          showroomId = cookieShowroomId.split('=')[1];
          const cookieShowroomName = document.cookie
            .split(';')
            .find((c) => c.trim().startsWith('showroom_name='));
          if (cookieShowroomName) {
            const showroomName = cookieShowroomName.split('=')[1];
            setShowroom({
              id: showroomId,
              showroom_name: decodeURIComponent(showroomName),
              business_type: '',
            });
          }
        }
      }

      if (showroomId) {
        const { data: brandingData, error: brandingError } = await supabase
          .from('showroom_branding')
          .select('logo_url')
          .eq('showroom_id', showroomId)
          .single();

        if (!brandingError && brandingData?.logo_url) {
          setLogoUrl(brandingData.logo_url);
          localStorage.setItem('showroom_logo', brandingData.logo_url);
        }
      }
    } catch (error) {
      console.error('Error fetching sidebar data:', error);
    }
  }

  const menuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { id: 'customer', label: 'Customers', icon: Users, href: '/dashboard/customer' },
    { id: 'vehicle', label: 'Vehicles', icon: Car, href: '/dashboard/vehicle' },
    { id: 'inventory', label: 'Inventory', icon: Package, href: '/dashboard/inventory' },
    { id: 'invoice', label: 'Invoices', icon: FileText, href: '/dashboard/invoice' },
    { id: 'service', label: 'Service', icon: Wrench, href: '/dashboard/service' },
    { id: 'stock', label: 'Stock', icon: Boxes, href: '/dashboard/stock' },
    { id: 'subscription', label: 'Subscription', icon: Crown, href: '/dashboard/subscription' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('showroom');
    localStorage.removeItem('user_logged_in');
    localStorage.removeItem('showroom_logo');
    sessionStorage.removeItem('showroom_logo');

    const cookies = [
      'user_id',
      'user_name',
      'user_email',
      'user_role',
      'showroom_id',
      'showroom_name',
      'user_logged_in',
      'showroom_logo',
    ];
    cookies.forEach((cookie) => {
      document.cookie = `${cookie}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
    });

    window.location.href = '/login';
  };

  return (
    <div
      className={`flex h-full flex-col border-r border-gray-200 bg-white transition-[width] duration-300 ease-in-out ${
        collapsed ? 'lg:w-20 w-72' : 'w-72 lg:w-64'
      }`}
    >
      {/* Brand header + collapse toggle */}
      <div className="flex items-center justify-between px-4 py-5">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#C15F3C]">
            {logoUrl ? (
              <img
                src={logoUrl || '/placeholder.svg'}
                alt={showroom?.showroom_name || 'Showroom Logo'}
                className="h-full w-full rounded-xl object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <Store className="h-5 w-5 text-white" />
            )}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold text-gray-900">
                {showroom?.showroom_name || 'EV Showroom'}
              </h1>
              <p className="truncate text-xs text-gray-500">Management System</p>
            </div>
          )}
        </Link>
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden shrink-0 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 lg:block"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft className={`h-5 w-5 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      <div className="h-px bg-gray-200" />

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          return (
            <Link
              key={item.id}
              href={item.href}
              title={collapsed ? item.label : undefined}
              onClick={onClose}
              className={`flex items-center gap-3 rounded-full px-3 py-2.5 text-sm transition-colors ${
                collapsed ? 'lg:justify-center' : ''
              } ${isActive ? 'font-semibold' : 'font-medium text-gray-600 hover:bg-gray-50'}`}
              style={isActive ? { background: ACCENT_SOFT, color: ACCENT } : undefined}
            >
              <Icon
                className={`h-5 w-5 shrink-0 ${isActive ? '' : 'text-gray-500'}`}
                style={isActive ? { color: ACCENT } : undefined}
              />
              <span className={`truncate ${collapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
              {item.badge && !collapsed ? (
                <span
                  className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold text-white"
                  style={{ background: ACCENT }}
                >
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {/* Footer: logout */}
      <div className="mx-4 h-px bg-gray-200" />
      <div className="p-3">
        <button
          type="button"
          onClick={handleLogout}
          title={collapsed ? 'Logout' : undefined}
          className={`flex w-full items-center gap-3 rounded-full px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 ${
            collapsed ? 'lg:justify-center' : ''
          }`}
        >
          <LogOut className="h-5 w-5 shrink-0 text-gray-500" />
          <span className={collapsed ? 'lg:hidden' : ''}>Logout</span>
        </button>
      </div>
    </div>
  );
}
