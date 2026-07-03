'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
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

  return (
    <aside className="flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <ShieldCheck className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold">Platform Admin</p>
          <p className="text-xs text-sidebar-foreground/60">EV SaaS Control</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => {
            const active = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-white/5 hover:text-sidebar-foreground'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="border-t border-sidebar-border px-5 py-4">
        <p className="text-xs text-sidebar-foreground/50 text-pretty">
          Full platform control. Changes affect all vendors.
        </p>
      </div>
    </aside>
  )
}
