'use client'

import useSWR from 'swr'
import { FileText } from 'lucide-react'
import { AdminTable, type Column } from '@/components/admin/AdminTable'
import { StatusBadge } from '@/components/admin/AdminUI'
import { fetcher, formatCurrency, formatDate } from '@/lib/admin-client'

type Invoice = {
  id: string
  invoice_number: string | null
  sale_date: string | null
  total_amount: number
  payment_status: string | null
  is_cancelled: boolean
  showroom_name: string | null
  customer_name: string | null
  customer_mobile: string | null
}

export default function SalesPage() {
  const { data, error, isLoading } = useSWR<{ data: Invoice[] }>('/api/admin/invoices', fetcher)

  const columns: Column<Invoice>[] = [
    {
      key: 'invoice_number',
      header: 'Invoice',
      render: (i) => <span className="font-medium text-foreground">{i.invoice_number || '—'}</span>,
    },
    {
      key: 'customer_name',
      header: 'Customer',
      render: (i) => (
        <div>
          <p className="text-foreground">{i.customer_name || '—'}</p>
          <p className="text-xs text-muted-foreground">{i.customer_mobile || '—'}</p>
        </div>
      ),
    },
    { key: 'showroom_name', header: 'Showroom', render: (i) => i.showroom_name || '—' },
    { key: 'total_amount', header: 'Amount', render: (i) => formatCurrency(i.total_amount) },
    { key: 'sale_date', header: 'Date', render: (i) => formatDate(i.sale_date) },
    {
      key: 'payment_status',
      header: 'Status',
      render: (i) => <StatusBadge status={i.is_cancelled ? 'cancelled' : i.payment_status} />,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FileText className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Sales Invoices</h2>
          <p className="text-sm text-muted-foreground">All sales invoices across every showroom.</p>
        </div>
      </div>

      <AdminTable
        columns={columns}
        rows={data?.data}
        isLoading={isLoading}
        error={error}
        getRowKey={(i) => i.id}
        searchKeys={['invoice_number', 'customer_name', 'customer_mobile', 'showroom_name']}
        searchPlaceholder="Search invoices, customers..."
        emptyLabel="No sales invoices yet"
      />
    </div>
  )
}
