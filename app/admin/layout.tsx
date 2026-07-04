'use client'

import { usePathname } from 'next/navigation'
import { AdminSidebar } from '@/components/admin/AdminSidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // The login page renders standalone, without the admin shell.
  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      <div className="hidden md:block sticky top-0 h-screen">
        <AdminSidebar />
      </div>
      <div className="flex min-w-0 flex-1 flex-col px-4 py-6 md:px-8 md:py-8">{children}</div>
    </div>
  )
}
