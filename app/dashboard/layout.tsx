'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { SubscriptionGate } from '@/components/SubscriptionGate';
import { SuspensionGate } from '@/components/SuspensionGate';
import { usePathname, useRouter } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  // Belt-and-suspenders client-side auth guard (mirrors proxy.ts logic).
  // Runs on every route change to catch mid-session cookie expiry and
  // logout-in-another-tab scenarios.
  useEffect(() => {
    const parts = document.cookie.split(';');
    const hasAuthToken  = parts.some(c => c.trim().startsWith('auth_token=') && c.trim() !== 'auth_token=');
    const hasLoggedIn   = parts.some(c => c.trim() === 'user_logged_in=true');
    if (!hasAuthToken && !hasLoggedIn) {
      router.replace('/');
    }
  }, [pathname, router]);
  
  // Get active section from pathname
  const getActiveSection = () => {
    const segments = pathname.split('/').filter(seg => seg !== '');
    if (segments.length >= 2) {
      return segments[1];
    }
    return 'dashboard';
  };

  const activeSection = getActiveSection();

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar - hidden on mobile by default */}
      <div className={`fixed inset-y-0 left-0 z-50 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out`}>
        <Sidebar
          activeSection={activeSection}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((v) => !v)}
        />
      </div>
      
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Main content */}
      <div className={`transition-[margin] duration-300 ease-in-out ${collapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        <Header activeSection={activeSection} onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="p-4 md:p-6 lg:p-8">
          <SuspensionGate>
            <SubscriptionGate>{children}</SubscriptionGate>
          </SuspensionGate>
        </main>
      </div>
    </div>
  );
}
