'use client'

import useSWR from 'swr'
import { UserRound } from 'lucide-react'
import { AdminTable, type Column } from '@/components/admin/AdminTable'
import { fetcher, formatDate } from '@/lib/admin-client'

type Customer = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  mobile: string | null
  city: string | null
  state: string | null
  customer_status: string | null
  created_at: string
  showroom_name: string | null
}

export default function CustomersPage() {
  const { data, error, isLoading } = useSWR<{ data: Customer[] }>('/api/admin/customers', fetcher)

  const columns: Column<Customer>[] = [
    {
      key: 'name',
      header: 'Customer',
      render: (c) => (
        <div>
          <p className="font-medium text-foreground">
            {[c.first_name, c.last_name].filter(Boolean).join(' ') || '—'}
          </p>
          <p className="text-xs text-muted-foreground">{c.email || '—'}</p>
        </div>
      ),
    },
    { key: 'mobile', header: 'Mobile', render: (c) => c.mobile || '—' },
    {
      key: 'location',
      header: 'Location',
      render: (c) => [c.city, c.state].filter(Boolean).join(', ') || '—',
    },
    { key: 'showroom_name', header: 'Showroom', render: (c) => c.showroom_name || '—' },
    { key: 'created_at', header: 'Added', render: (c) => formatDate(c.created_at) },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <UserRound className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Customers</h2>
          <p className="text-sm text-muted-foreground">All customers across every showroom.</p>
        </div>
      </div>

      <AdminTable
        columns={columns}
        rows={data?.data}
        isLoading={isLoading}
        error={error}
        getRowKey={(c) => c.id}
        searchKeys={['first_name', 'last_name', 'email', 'mobile', 'city', 'showroom_name']}
        searchPlaceholder="Search customers..."
        emptyLabel="No customers yet"
      />
    </div>
  )
}
