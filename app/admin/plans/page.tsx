'use client'

import useSWR from 'swr'
import { useState } from 'react'
import { CreditCard, Plus, Pencil, Trash2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingState, ErrorState, EmptyState } from '@/components/admin/AdminUI'
import { fetcher, adminMutate, formatCurrency } from '@/lib/admin-client'

type Plan = {
  id: string
  plan_name: string
  description: string | null
  price: number
  billing_cycle: string | null
  max_users: number | null
  max_vehicles: number | null
  features: string[]
  is_active: boolean
  subscriber_count: number
}

const emptyForm = {
  plan_name: '',
  description: '',
  price: '',
  billing_cycle: 'monthly',
  max_users: '',
  max_vehicles: '',
  features: '',
}

export default function PlansPage() {
  const { data, error, isLoading, mutate } = useSWR<{ data: Plan[] }>('/api/admin/plans', fetcher)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<Plan | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')

  const openCreate = () => {
    setForm(emptyForm)
    setEditingId(null)
    setFormError('')
    setDialogOpen(true)
  }

  const openEdit = (p: Plan) => {
    setForm({
      plan_name: p.plan_name,
      description: p.description || '',
      price: String(p.price ?? ''),
      billing_cycle: p.billing_cycle || 'monthly',
      max_users: p.max_users != null ? String(p.max_users) : '',
      max_vehicles: p.max_vehicles != null ? String(p.max_vehicles) : '',
      features: (p.features || []).join('\n'),
    })
    setEditingId(p.id)
    setFormError('')
    setDialogOpen(true)
  }

  const save = async () => {
    if (!form.plan_name.trim()) {
      setFormError('Plan name is required')
      return
    }
    setBusy(true)
    setFormError('')
    const payload = {
      plan_name: form.plan_name.trim(),
      description: form.description.trim() || null,
      price: Number(form.price) || 0,
      billing_cycle: form.billing_cycle,
      max_users: form.max_users ? Number(form.max_users) : null,
      max_vehicles: form.max_vehicles ? Number(form.max_vehicles) : null,
      features: form.features
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean),
    }
    try {
      if (editingId) {
        await adminMutate(`/api/admin/plans/${editingId}`, 'PATCH', payload)
      } else {
        await adminMutate('/api/admin/plans', 'POST', payload)
      }
      setDialogOpen(false)
      mutate()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to save plan')
    } finally {
      setBusy(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setBusy(true)
    setFormError('')
    try {
      await adminMutate(`/api/admin/plans/${deleting.id}`, 'DELETE')
      setDeleting(null)
      mutate()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to delete')
    } finally {
      setBusy(false)
    }
  }

  const plans = data?.data ?? []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Subscription Plans</h2>
            <p className="text-sm text-muted-foreground">Pricing tiers offered to showrooms.</p>
          </div>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Plan
        </Button>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState />
      ) : plans.length === 0 ? (
        <EmptyState message="No subscription plans yet" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => (
            <Card key={p.id} className="flex flex-col gap-4 p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{p.plan_name}</h3>
                    {!p.is_active && <Badge variant="outline">Inactive</Badge>}
                  </div>
                  <p className="mt-1 text-2xl font-bold text-foreground">
                    {formatCurrency(p.price)}
                    <span className="text-sm font-normal text-muted-foreground">/{p.billing_cycle}</span>
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(p)} title="Edit">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleting(p)} title="Delete">
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>

              {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>{p.max_users != null ? `${p.max_users} users` : 'Unlimited users'}</span>
                <span>{p.max_vehicles != null ? `${p.max_vehicles} vehicles` : 'Unlimited vehicles'}</span>
                <span>{p.subscriber_count} subscriber{p.subscriber_count === 1 ? '' : 's'}</span>
              </div>

              {p.features?.length > 0 && (
                <ul className="flex flex-col gap-1.5 text-sm text-foreground">
                  {p.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Plan' : 'Add Plan'}</DialogTitle>
            <DialogDescription>Configure the pricing tier and its limits.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="pname">Plan Name</Label>
              <Input id="pname" value={form.plan_name} onChange={(e) => setForm({ ...form, plan_name: e.target.value })} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="pdesc">Description</Label>
              <Textarea id="pdesc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="pprice">Price (₹)</Label>
                <Input id="pprice" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="pcycle">Billing Cycle</Label>
                <Input id="pcycle" value={form.billing_cycle} onChange={(e) => setForm({ ...form, billing_cycle: e.target.value })} placeholder="monthly / yearly" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="pusers">Max Users</Label>
                <Input id="pusers" type="number" value={form.max_users} onChange={(e) => setForm({ ...form, max_users: e.target.value })} placeholder="Blank = unlimited" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="pveh">Max Vehicles</Label>
                <Input id="pveh" type="number" value={form.max_vehicles} onChange={(e) => setForm({ ...form, max_vehicles: e.target.value })} placeholder="Blank = unlimited" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="pfeat">Features (one per line)</Label>
              <Textarea id="pfeat" value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} rows={4} placeholder="Customer management&#10;Inventory tracking" />
            </div>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={busy}>{busy ? 'Saving...' : editingId ? 'Save Changes' : 'Add Plan'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Plan</DialogTitle>
            <DialogDescription>
              This permanently deletes {deleting?.plan_name}. Plans with active subscribers cannot be deleted.
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
