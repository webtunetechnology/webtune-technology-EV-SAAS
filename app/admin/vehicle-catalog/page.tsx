'use client'

import useSWR from 'swr'
import { useState } from 'react'
import { Car, Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { fetcher, adminMutate, formatCurrency } from '@/lib/admin-client'

type Vehicle = {
  id: string
  brand_id: string
  brand_name: string | null
  model_name: string
  variant_name: string | null
  vehicle_type: string | null
  ex_showroom_price: number | null
  battery_capacity_kwh: number | null
  range_per_charge_km: number | null
  motor_power_kw: number | null
  top_speed_kmph: number | null
  seating_capacity: number | null
  is_active: boolean
}

type Brand = { id: string; brand_name: string }

const emptyForm = {
  brand_id: '',
  model_name: '',
  variant_name: '',
  vehicle_type: '',
  ex_showroom_price: '',
  battery_capacity_kwh: '',
  range_per_charge_km: '',
  motor_power_kw: '',
  top_speed_kmph: '',
  seating_capacity: '',
}

export default function VehicleCatalogPage() {
  const { data, error, isLoading, mutate } = useSWR<{ data: Vehicle[] }>('/api/admin/vehicles', fetcher)
  const { data: brandsData } = useSWR<{ data: Brand[] }>('/api/admin/brands', fetcher)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<Vehicle | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')

  const brands = brandsData?.data ?? []

  const openCreate = () => {
    setForm(emptyForm)
    setEditingId(null)
    setFormError('')
    setDialogOpen(true)
  }

  const openEdit = (v: Vehicle) => {
    setForm({
      brand_id: v.brand_id || '',
      model_name: v.model_name || '',
      variant_name: v.variant_name || '',
      vehicle_type: v.vehicle_type || '',
      ex_showroom_price: v.ex_showroom_price != null ? String(v.ex_showroom_price) : '',
      battery_capacity_kwh: v.battery_capacity_kwh != null ? String(v.battery_capacity_kwh) : '',
      range_per_charge_km: v.range_per_charge_km != null ? String(v.range_per_charge_km) : '',
      motor_power_kw: v.motor_power_kw != null ? String(v.motor_power_kw) : '',
      top_speed_kmph: v.top_speed_kmph != null ? String(v.top_speed_kmph) : '',
      seating_capacity: v.seating_capacity != null ? String(v.seating_capacity) : '',
    })
    setEditingId(v.id)
    setFormError('')
    setDialogOpen(true)
  }

  const num = (s: string) => (s.trim() ? Number(s) : null)

  const save = async () => {
    if (!form.brand_id || !form.model_name.trim()) {
      setFormError('Brand and model name are required')
      return
    }
    setBusy(true)
    setFormError('')
    const payload = {
      brand_id: form.brand_id,
      model_name: form.model_name.trim(),
      variant_name: form.variant_name.trim() || null,
      vehicle_type: form.vehicle_type.trim() || null,
      ex_showroom_price: num(form.ex_showroom_price),
      battery_capacity_kwh: num(form.battery_capacity_kwh),
      range_per_charge_km: num(form.range_per_charge_km),
      motor_power_kw: num(form.motor_power_kw),
      top_speed_kmph: num(form.top_speed_kmph),
      seating_capacity: num(form.seating_capacity),
    }
    try {
      if (editingId) {
        await adminMutate(`/api/admin/vehicles/${editingId}`, 'PATCH', payload)
      } else {
        await adminMutate('/api/admin/vehicles', 'POST', payload)
      }
      setDialogOpen(false)
      mutate()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to save vehicle')
    } finally {
      setBusy(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setBusy(true)
    setFormError('')
    try {
      await adminMutate(`/api/admin/vehicles/${deleting.id}`, 'DELETE')
      setDeleting(null)
      mutate()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to delete')
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Vehicle' : 'Add Vehicle'}</DialogTitle>
            <DialogDescription>Configure a vehicle model in the master catalog.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>Brand</Label>
                <Select value={form.brand_id} onValueChange={(v) => setForm({ ...form, brand_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.brand_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="vtype">Vehicle Type</Label>
                <Input id="vtype" value={form.vehicle_type} onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })} placeholder="Scooter / Bike / Car" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="vmodel">Model Name</Label>
                <Input id="vmodel" value={form.model_name} onChange={(e) => setForm({ ...form, model_name: e.target.value })} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="vvar">Variant</Label>
                <Input id="vvar" value={form.variant_name} onChange={(e) => setForm({ ...form, variant_name: e.target.value })} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="vprice">Ex-Showroom Price (₹)</Label>
                <Input id="vprice" type="number" value={form.ex_showroom_price} onChange={(e) => setForm({ ...form, ex_showroom_price: e.target.value })} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="vbat">Battery (kWh)</Label>
                <Input id="vbat" type="number" value={form.battery_capacity_kwh} onChange={(e) => setForm({ ...form, battery_capacity_kwh: e.target.value })} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="vrange">Range (km)</Label>
                <Input id="vrange" type="number" value={form.range_per_charge_km} onChange={(e) => setForm({ ...form, range_per_charge_km: e.target.value })} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="vmotor">Motor Power (kW)</Label>
                <Input id="vmotor" type="number" value={form.motor_power_kw} onChange={(e) => setForm({ ...form, motor_power_kw: e.target.value })} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="vspeed">Top Speed (km/h)</Label>
                <Input id="vspeed" type="number" value={form.top_speed_kmph} onChange={(e) => setForm({ ...form, top_speed_kmph: e.target.value })} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="vseat">Seating Capacity</Label>
                <Input id="vseat" type="number" value={form.seating_capacity} onChange={(e) => setForm({ ...form, seating_capacity: e.target.value })} />
              </div>
            </div>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={busy}>{busy ? 'Saving...' : editingId ? 'Save Changes' : 'Add Vehicle'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Vehicle</DialogTitle>
            <DialogDescription>
              This permanently deletes {deleting?.model_name}. Models referenced by existing inventory cannot be deleted.
            </DialogDescription>
          </DialogHeader>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
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
