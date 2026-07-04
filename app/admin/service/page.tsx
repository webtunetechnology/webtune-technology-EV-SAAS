'use client'

import useSWR from 'swr'
import { Wrench } from 'lucide-react'
import { AdminTable, type Column } from '@/components/admin/AdminTable'
import { StatusBadge } from '@/components/admin/AdminUI'
import { fetcher, formatCurrency, formatDate } from '@/lib/admin-client'

type ServiceRecord = {
  id: string
  service_type: string | null
  status: string | null
  payment_status: string | null
  service_date: string | null
  total_amount: number
  customer_rating: number | null
  showroom_name: string | null
  customer_name: string | null
}

export default function ServicePage() {
  const { data, error, isLoading } = useSWR<{ data: ServiceRecord[] }>('/api/admin/service', fetcher)

  const columns: Column<ServiceRecord>[] = [
    {
      key: 'service_type',
      header: 'Service',
      render: (s) => (
        <span className="font-medium capitalize text-foreground">
          {(s.service_type || '—').replace(/_/g, ' ')}
        </span>
      ),
    },
    { key: 'customer_name', header: 'Customer', render: (s) => s.customer_name || '—' },
    { key: 'showroom_name', header: 'Showroom', render: (s) => s.showroom_name || '—' },
    { key: 'total_amount', header: 'Amount', render: (s) => formatCurrency(s.total_amount) },
    { key: 'service_date', header: 'Date', render: (s) => formatDate(s.service_date) },
    { key: 'status', header: 'Status', render: (s) => <StatusBadge status={s.status} /> },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Wrench className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Service Records</h2>
          <p className="text-sm text-muted-foreground">All service jobs across every showroom.</p>
        </div>
      </div>

      <AdminTable
        columns={columns}
        rows={data?.data}
        isLoading={isLoading}
        error={error}
        getRowKey={(s) => s.id}
        searchKeys={['service_type', 'customer_name', 'showroom_name']}
        searchPlaceholder="Search service records..."
        emptyLabel="No service records yet"
      />
    </div>
  )
}
