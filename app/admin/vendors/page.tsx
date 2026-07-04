'use client'

import useSWR from 'swr'
import { useState } from 'react'
import { Store, Pencil, Trash2, Power, Crown } from 'lucide-react'
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
import { resolveAccess } from '@/lib/subscription'

type SubInfo = {
  plan_id: string | null
  plan_name: string | null
  plan_price: number | null
  payment_status: string | null
  is_trial: boolean
  subscription_expiry: string | null
} | null

type Vendor = {
  id: string
  showroom_name: string
  business_type: string | null
  gst_number: string | null
  is_active: boolean
  created_at: string
  owner: { full_name: string | null; email: string | null; mobile_number: string | null } | null
  counts: { customers: number; inventory: number; invoices: number }
  subscription: SubInfo
}

type Plan = { id: string; plan_name: string; price: number; billing_cycle: string }

const SUB_BADGE: Record<string, string> = {
  trial: 'bg-blue-50 text-blue-700 border-blue-200',
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  expired: 'bg-red-50 text-red-700 border-red-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  cancelled: 'bg-gray-100 text-gray-600 border-gray-200',
  none: 'bg-gray-100 text-gray-600 border-gray-200',
}

export default function VendorsPage() {
  const { data, error, isLoading, mutate } = useSWR<{ data: Vendor[] }>('/api/admin/showrooms', fetcher)
  const { data: plansData } = useSWR<{ data: Plan[] }>('/api/admin/plans', fetcher)
  const plans = plansData?.data || []

  const [editing, setEditing] = useState<Vendor | null>(null)
  const [deleting, setDeleting] = useState<Vendor | null>(null)
  const [managing, setManaging] = useState<Vendor | null>(null)
  const [form, setForm] = useState({ showroom_name: '', business_type: '', gst_number: '' })
  const [subForm, setSubForm] = useState<{ plan_id: string; billing_cycle: string }>({ plan_id: '', billing_cycle: 'monthly' })
  const [busy, setBusy] = useState(false)

  const openEdit = (v: Vendor) => {
    setEditing(v)
    setForm({
      showroom_name: v.showroom_name || '',
      business_type: v.business_type || '',
      gst_number: v.gst_number || '',
    })
  }

  const openManage = (v: Vendor) => {
    setManaging(v)
    setSubForm({
      plan_id: v.subscription?.plan_id || '',
      billing_cycle: 'monthly',
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

  const subAction = async (payload: Record<string, any>) => {
    if (!managing) return
    setBusy(true)
    await adminMutate(`/api/admin/showrooms/${managing.id}/subscription`, 'PATCH', payload)
    setBusy(false)
    setManaging(null)
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
    {
      key: 'subscription',
      header: 'Subscription',
      render: (v) => {
        const access = resolveAccess(v.subscription as any)
        return (
          <div className="flex flex-col gap-1">
            <span
              className={`inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${
                SUB_BADGE[access.status] || SUB_BADGE.none
              }`}
            >
              {access.status}
            </span>
            <span className="text-xs text-muted-foreground">
              {v.subscription?.plan_name || (access.isTrial ? 'Trial' : 'No plan')}
              {access.hasAccess && access.expiresAt ? ` · ${access.daysLeft}d left` : ''}
            </span>
          </div>
        )
      },
    },
    { key: 'customers', header: 'Customers', render: (v) => v.counts?.customers ?? 0 },
    { key: 'created_at', header: 'Joined', render: (v) => formatDate(v.created_at) },
    {
      key: 'is_active',
      header: 'Account',
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
          <p className="text-sm text-muted-foreground">Manage every showroom and its subscription.</p>
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
            <Button variant="ghost" size="icon" onClick={() => openManage(v)} title="Manage subscription">
              <Crown className="h-4 w-4 text-emerald-600" />
            </Button>
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

      {/* Manage subscription dialog */}
      <Dialog open={!!managing} onOpenChange={(o) => !o && setManaging(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Subscription</DialogTitle>
            <DialogDescription>
              {managing?.showroom_name} — current status:{' '}
              <span className="font-medium capitalize">{resolveAccess(managing?.subscription as any).status}</span>
              {managing?.subscription?.subscription_expiry
                ? ` (expires ${formatDate(managing.subscription.subscription_expiry)})`
                : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="plan">Plan</Label>
              <select
                id="plan"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={subForm.plan_id}
                onChange={(e) => setSubForm({ ...subForm, plan_id: e.target.value })}
              >
                <option value="">— Select plan —</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.plan_name} (₹{p.price}/{p.billing_cycle})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="cycle">Billing Cycle</Label>
              <select
                id="cycle"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={subForm.billing_cycle}
                onChange={(e) => setSubForm({ ...subForm, billing_cycle: e.target.value })}
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                size="sm"
                disabled={busy || !subForm.plan_id}
                onClick={() => subAction({ action: 'activate', plan_id: subForm.plan_id, billing_cycle: subForm.billing_cycle })}
              >
                Activate Plan
              </Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => subAction({ extend_days: 30 })}>
                Extend 30 days
              </Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => subAction({ action: 'start_trial' })}>
                Reset Trial
              </Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => subAction({ action: 'expire' })}>
                Mark Expired
              </Button>
              <Button size="sm" variant="destructive" disabled={busy} onClick={() => subAction({ action: 'cancel' })}>
                Cancel
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setManaging(null)}>Close</Button>
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
