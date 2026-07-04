'use client'

import useSWR from 'swr'
import { useState } from 'react'
import { Car, Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { AdminTable, type Column } from '@/components/admin/AdminTable'
import { StatusBadge } from '@/components/admin/AdminUI'
import { VehicleFormModal, type Vehicle, type Brand } from '@/components/admin/VehicleFormModal'
import { fetcher, adminMutate, formatCurrency } from '@/lib/admin-client'

export default function VehicleCatalogPage() {
  const { data, error, isLoading, mutate } = useSWR<{ data: Vehicle[] }>('/api/admin/vehicles', fetcher)
  const { data: brandsData } = useSWR<{ data: Brand[] }>('/api/admin/brands', fetcher)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Vehicle | null>(null)
  const [deleting, setDeleting] = useState<Vehicle | null>(null)
  const [busy, setBusy] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const brands = brandsData?.data ?? []

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (v: Vehicle) => {
    setEditing(v)
    setFormOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setBusy(true)
    setDeleteError('')
    try {
      await adminMutate(`/api/admin/vehicles/${deleting.id}`, 'DELETE')
      setDeleting(null)
      mutate()
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Failed to delete')
    } finally {
      setBusy(false)
    }
  }

  const columns: Column<Vehicle>[] = [
    {
      key: 'model_name',
      header: 'Model',
      render: (v) => (
        <div>
          <p className="font-medium text-foreground">{v.model_name}</p>
          <p className="text-xs text-muted-foreground">{v.brand_name || '—'}{v.variant_name ? ` • ${v.variant_name}` : ''}</p>
        </div>
      ),
    },
    { key: 'vehicle_type', header: 'Type', render: (v) => v.vehicle_type || '—' },
    { key: 'range_per_charge_km', header: 'Range', render: (v) => (v.range_per_charge_km != null ? `${v.range_per_charge_km} km` : '—') },
    { key: 'battery_capacity_kwh', header: 'Battery', render: (v) => (v.battery_capacity_kwh != null ? `${v.battery_capacity_kwh} kWh` : '—') },
    { key: 'ex_showroom_price', header: 'Ex-Showroom', render: (v) => formatCurrency(v.ex_showroom_price) },
    { key: 'is_active', header: 'Status', render: (v) => <StatusBadge status={v.is_active ? 'active' : 'inactive'} /> },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Car className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Vehicle Catalog</h2>
            <p className="text-sm text-muted-foreground">Master catalog of EV models available to all showrooms.</p>
          </div>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Vehicle
        </Button>
      </div>

      <AdminTable
        columns={columns}
        rows={data?.data}
        isLoading={isLoading}
        error={error}
        getRowKey={(v) => v.id}
        searchKeys={['model_name', 'variant_name', 'brand_name', 'vehicle_type']}
        searchPlaceholder="Search models, brands..."
        emptyLabel="No vehicles in catalog yet"
        actions={(v) => (
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" onClick={() => openEdit(v)} title="Edit">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setDeleting(v)} title="Delete">
              <Trash2 className="h-4 w-4 text-red-600" />
            </Button>
          </div>
        )}
      />

      <VehicleFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editing={editing}
        brands={brands}
        onSaved={() => mutate()}
      />

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Vehicle</DialogTitle>
            <DialogDescription>
              This permanently deletes {deleting?.model_name}. Models referenced by existing inventory cannot be deleted.
            </DialogDescription>
          </DialogHeader>
          {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={busy}>
              {busy ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
