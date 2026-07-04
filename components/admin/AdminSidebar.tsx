'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard,
  Store,
  Users,
  UserRound,
  Boxes,
  ReceiptText,
  Wrench,
  Car,
  Tags,
  CreditCard,
  ShieldCheck,
  ChevronLeft,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type NavItem = {
  href: string
  label: string
  icon: typeof LayoutDashboard
  badge?: number
}

const navItems: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/vendors', label: 'Vendors', icon: Store },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/customers', label: 'Customers', icon: UserRound },
  { href: '/admin/inventory', label: 'Inventory', icon: Boxes },
  { href: '/admin/sales', label: 'Sales', icon: ReceiptText },
  { href: '/admin/service', label: 'Service', icon: Wrench },
  { href: '/admin/vehicle-catalog', label: 'Vehicle Catalog', icon: Car },
  { href: '/admin/brands', label: 'Brands', icon: Tags },
  { href: '/admin/plans', label: 'Plans', icon: CreditCard },
]

export function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' })
    window.location.replace('/admin/login')
  }

  return (
    <aside
      className={cn(
        'flex h-full flex-col bg-white border-r border-gray-200 transition-[width] duration-300 ease-in-out',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Brand header + collapse toggle */}
      <div className="flex items-center justify-between px-4 py-5">
        <Link href="/admin" onClick={onNavigate} className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#C15F3C] shrink-0">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <span className="text-base font-bold tracking-[0.15em] text-gray-900 truncate">
              EV ADMIN
            </span>
          )}
        </Link>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="shrink-0 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft className={cn('h-5 w-5 transition-transform', collapsed && 'rotate-180')} />
        </button>
      </div>

      <div className="h-px bg-gray-200" />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => {
            const active =
              item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-full px-3 py-2.5 text-sm transition-colors',
                    collapsed && 'justify-center',
                    active
                      ? 'bg-[#F8E7DC] font-semibold text-[#C15F3C]'
                      : 'font-medium text-gray-600 hover:bg-gray-50'
                  )}
                >
                  <Icon
                    className={cn('h-5 w-5 shrink-0', active ? 'text-[#C15F3C]' : 'text-gray-500')}
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {!collapsed && item.badge ? (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[#C15F3C] px-1.5 text-xs font-semibold text-white">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer: logout */}
      <div className="mx-4 h-px bg-gray-200" />
      <div className="p-3">
        <button
          type="button"
          onClick={handleLogout}
          title={collapsed ? 'Logout' : undefined}
          className={cn(
            'flex w-full items-center gap-3 rounded-full px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50',
            collapsed && 'justify-center'
          )}
        >
          <LogOut className="h-5 w-5 shrink-0 text-gray-500" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  )
}
