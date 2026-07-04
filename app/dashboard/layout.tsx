'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { SubscriptionGate } from '@/components/SubscriptionGate';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  
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
          <SubscriptionGate>{children}</SubscriptionGate>
        </main>
      </div>
    </div>
  );
}
