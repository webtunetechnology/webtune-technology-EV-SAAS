'use client'

import useSWR from 'swr'
import { Boxes } from 'lucide-react'
import { AdminTable, type Column } from '@/components/admin/AdminTable'
import { StatusBadge } from '@/components/admin/AdminUI'
import { fetcher, formatCurrency, formatDate } from '@/lib/admin-client'

type InventoryUnit = {
  id: string
  chassis_number: string | null
  vin_number: string | null
  variant_name: string | null
  color: string | null
  stock_status: string | null
  current_selling_price: number | null
  showroom_name: string | null
  model: { model_name: string | null; variant_name: string | null } | null
  received_date: string | null
}

export default function InventoryPage() {
  const { data, error, isLoading } = useSWR<{ data: InventoryUnit[] }>('/api/admin/inventory', fetcher)

  const columns: Column<InventoryUnit>[] = [
    {
      key: 'model',
      header: 'Vehicle',
      render: (u) => (
        <div>
          <p className="font-medium text-foreground">{u.model?.model_name || u.variant_name || '—'}</p>
          <p className="text-xs text-muted-foreground">{u.color || u.model?.variant_name || '—'}</p>
        </div>
      ),
    },
    {
      key: 'chassis_number',
      header: 'Chassis / VIN',
      render: (u) => (
        <div>
          <p className="text-foreground">{u.chassis_number || '—'}</p>
          <p className="text-xs text-muted-foreground">{u.vin_number || '—'}</p>
        </div>
      ),
    },
    { key: 'showroom_name', header: 'Showroom', render: (u) => u.showroom_name || '—' },
    { key: 'current_selling_price', header: 'Price', render: (u) => formatCurrency(u.current_selling_price) },
    { key: 'received_date', header: 'Received', render: (u) => formatDate(u.received_date) },
    { key: 'stock_status', header: 'Status', render: (u) => <StatusBadge status={u.stock_status} /> },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Boxes className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Inventory</h2>
          <p className="text-sm text-muted-foreground">Every vehicle unit across all showrooms.</p>
        </div>
      </div>

      <AdminTable
        columns={columns}
        rows={data?.data}
        isLoading={isLoading}
        error={error}
        getRowKey={(u) => u.id}
        searchKeys={['chassis_number', 'vin_number', 'variant_name', 'showroom_name']}
        searchPlaceholder="Search by chassis, VIN, showroom..."
        emptyLabel="No inventory units yet"
      />
    </div>
  )
}
