'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { AdminSidebar } from './AdminSidebar'
import { LogOut, Menu } from 'lucide-react'

export function AdminHeader({ title }: { title: string }) {
  const router = useRouter()
  const [adminName, setAdminName] = useState('')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const match = document.cookie.split('; ').find((r) => r.startsWith('admin_name='))
    if (match) setAdminName(decodeURIComponent(match.split('=')[1]))
  }, [])

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' })
    window.location.replace('/admin/login')
  }

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-border bg-background px-4 py-3 md:px-6">
      <div className="flex items-center gap-3">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 [&>button]:text-sidebar-foreground">
            <SheetTitle className="sr-only">Admin navigation</SheetTitle>
            <AdminSidebar onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <h1 className="text-lg font-semibold text-foreground text-balance md:text-xl">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        {adminName && (
          <span className="hidden text-sm text-muted-foreground sm:inline">{adminName}</span>
        )}
        <Button variant="outline" size="sm" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </header>
  )
}
