'use client'

import useSWR from 'swr'
import Link from 'next/link'
import { fetcher, formatCurrency } from '@/lib/admin-client'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { StatCard, LoadingState, ErrorState } from '@/components/admin/AdminUI'
import { Card } from '@/components/ui/card'
import {
  Store,
  Users,
  UserRound,
  Boxes,
  ReceiptText,
  Wrench,
  Car,
  CreditCard,
  IndianRupee,
  ArrowRight,
} from 'lucide-react'

export default function AdminDashboardPage() {
  const { data, error, isLoading } = useSWR('/api/admin/stats', fetcher)
  const stats = data?.stats

  return (
    <>
      <AdminHeader title="Platform Overview" />
      <main className="flex-1 p-4 md:p-6">
        {isLoading && <LoadingState label="Loading platform stats..." />}
        {error && <ErrorState message="Failed to load platform statistics." />}

        {stats && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Total Revenue" value={formatCurrency(stats.totalRevenue)} icon={IndianRupee} hint="Across all showrooms" />
              <StatCard label="Vendors / Showrooms" value={stats.showrooms} icon={Store} />
              <StatCard label="Platform Users" value={stats.users} icon={Users} />
              <StatCard label="Total Customers" value={stats.customers} icon={UserRound} />
              <StatCard label="Inventory Units" value={stats.inventory} icon={Boxes} hint={`${stats.inventoryAvailable} available`} />
              <StatCard label="Sales Invoices" value={stats.invoices} icon={ReceiptText} />
              <StatCard label="Service Records" value={stats.serviceRecords} icon={Wrench} />
              <StatCard label="Vehicle Models" value={stats.vehicles} icon={Car} />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <QuickLink href="/admin/vendors" title="Manage Vendors" description="View, edit, suspend, or delete showrooms" icon={Store} />
              <QuickLink href="/admin/users" title="Manage Users" description="Control every account and role on the platform" icon={Users} />
              <QuickLink href="/admin/plans" title="Subscription Plans" description={`${stats.plans} plans configured`} icon={CreditCard} />
              <QuickLink href="/admin/vehicle-catalog" title="Vehicle Catalog" description={`${stats.vehicles} models in master catalog`} icon={Car} />
            </div>
          </div>
        )}
      </main>
    </>
  )
}

function QuickLink({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: string
  title: string
  description: string
  icon: typeof Store
}) {
  return (
    <Link href={href}>
      <Card className="flex items-center justify-between gap-4 p-5 transition-colors hover:bg-muted/50">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-foreground">{title}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <ArrowRight className="h-5 w-5 text-muted-foreground" />
      </Card>
    </Link>
  )
}
