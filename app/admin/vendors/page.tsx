'use client'

import useSWR from 'swr'
import { useState } from 'react'
import { Store, Pencil, Trash2, Power } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { fetcher, adminMutate, formatDate } from '@/lib/admin-client'

type Vendor = {
  id: string
  showroom_name: string
  business_type: string | null
  gst_number: string | null
  is_active: boolean
  created_at: string
  owner: { full_name: string | null; email: string | null; mobile_number: string | null } | null
  counts: { customers: number; inventory: number; invoices: number }
  subscription: { plan_name: string | null } | null
}

export default function VendorsPage() {
  const { data, error, isLoading, mutate } = useSWR<{ data: Vendor[] }>('/api/admin/showrooms', fetcher)
  const [editing, setEditing] = useState<Vendor | null>(null)
  const [deleting, setDeleting] = useState<Vendor | null>(null)
  const [form, setForm] = useState({ showroom_name: '', business_type: '', gst_number: '' })
  const [busy, setBusy] = useState(false)

  const openEdit = (v: Vendor) => {
    setEditing(v)
    setForm({
      showroom_name: v.showroom_name || '',
      business_type: v.business_type || '',
      gst_number: v.gst_number || '',
    })
  }

  const saveEdit = async () => {
    if (!editing) return
    setBusy(true)
    await adminMutate(`/api/admin/showrooms/${editing.id}`, 'PATCH', form)
    setBusy(false)
    setEditing(null)
    mutate()
  }

  const toggleActive = async (v: Vendor) => {
    await adminMutate(`/api/admin/showrooms/${v.id}`, 'PATCH', { is_active: !v.is_active })
    mutate()
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setBusy(true)
    await adminMutate(`/api/admin/showrooms/${deleting.id}`, 'DELETE')
    setBusy(false)
    setDeleting(null)
    mutate()
  }

  const columns: Column<Vendor>[] = [
    {
      key: 'showroom_name',
      header: 'Showroom',
      render: (v) => (
        <div>
          <p className="font-medium text-foreground">{v.showroom_name}</p>
          <p className="text-xs text-muted-foreground">{v.business_type || '—'}</p>
        </div>
      ),
    },
    {
      key: 'owner',
      header: 'Owner',
      render: (v) => (
        <div>
          <p className="text-foreground">{v.owner?.full_name || '—'}</p>
          <p className="text-xs text-muted-foreground">{v.owner?.email || v.owner?.mobile_number || '—'}</p>
        </div>
      ),
    },
    { key: 'plan', header: 'Plan', render: (v) => v.subscription?.plan_name || 'None' },
    { key: 'customers', header: 'Customers', render: (v) => v.counts?.customers ?? 0 },
    { key: 'inventory', header: 'Inventory', render: (v) => v.counts?.inventory ?? 0 },
    { key: 'created_at', header: 'Joined', render: (v) => formatDate(v.created_at) },
    {
      key: 'is_active',
      header: 'Status',
      render: (v) => <StatusBadge status={v.is_active ? 'active' : 'suspended'} />,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Store className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Vendors & Showrooms</h2>
          <p className="text-sm text-muted-foreground">Manage every showroom on the platform.</p>
        </div>
      </div>

      <AdminTable
        columns={columns}
        rows={data?.data}
        isLoading={isLoading}
        error={error}
        getRowKey={(v) => v.id}
        searchKeys={['showroom_name', 'business_type', 'gst_number']}
        searchPlaceholder="Search showrooms, owners, GST..."
        emptyLabel="No vendors yet"
        actions={(v) => (
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" onClick={() => openEdit(v)} title="Edit">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => toggleActive(v)} title={v.is_active ? 'Suspend' : 'Activate'}>
              <Power className={`h-4 w-4 ${v.is_active ? 'text-amber-600' : 'text-emerald-600'}`} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setDeleting(v)} title="Delete">
              <Trash2 className="h-4 w-4 text-red-600" />
            </Button>
          </div>
        )}
      />

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Showroom</DialogTitle>
            <DialogDescription>Update details for {editing?.showroom_name}.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="sname">Showroom Name</Label>
              <Input id="sname" value={form.showroom_name} onChange={(e) => setForm({ ...form, showroom_name: e.target.value })} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="btype">Business Type</Label>
              <Input id="btype" value={form.business_type} onChange={(e) => setForm({ ...form, business_type: e.target.value })} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="gst">GST Number</Label>
              <Input id="gst" value={form.gst_number} onChange={(e) => setForm({ ...form, gst_number: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={busy}>{busy ? 'Saving...' : 'Save Changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Showroom</DialogTitle>
            <DialogDescription>
              This permanently deletes {deleting?.showroom_name}, its owner account, and all associated data
              (customers, inventory, invoices, service records). This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={busy}>
              {busy ? 'Deleting...' : 'Delete Permanently'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
