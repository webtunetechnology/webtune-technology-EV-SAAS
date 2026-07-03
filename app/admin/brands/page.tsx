'use client'

import useSWR from 'swr'
import { useState } from 'react'
import { Tags, Plus, Pencil, Trash2 } from 'lucide-react'
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
import { fetcher, adminMutate, formatDate } from '@/lib/admin-client'

type Brand = {
  id: string
  brand_name: string
  model_count: number
  created_at: string
}

export default function BrandsPage() {
  const { data, error, isLoading, mutate } = useSWR<{ data: Brand[] }>('/api/admin/brands', fetcher)
  const [editing, setEditing] = useState<Brand | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<Brand | null>(null)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')

  const openCreate = () => {
    setName('')
    setFormError('')
    setCreating(true)
  }
  const openEdit = (b: Brand) => {
    setName(b.brand_name)
    setFormError('')
    setEditing(b)
  }

  const save = async () => {
    if (!name.trim()) {
      setFormError('Brand name is required')
      return
    }
    setBusy(true)
    setFormError('')
    try {
      if (editing) {
        await adminMutate(`/api/admin/brands/${editing.id}`, 'PATCH', { brand_name: name.trim() })
      } else {
        await adminMutate('/api/admin/brands', 'POST', { brand_name: name.trim() })
      }
      setEditing(null)
      setCreating(false)
      mutate()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setBusy(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setBusy(true)
    setFormError('')
    try {
      await adminMutate(`/api/admin/brands/${deleting.id}`, 'DELETE')
      setDeleting(null)
      mutate()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to delete')
    } finally {
      setBusy(false)
    }
  }

  const columns: Column<Brand>[] = [
    {
      key: 'brand_name',
      header: 'Brand',
      render: (b) => <span className="font-medium text-foreground">{b.brand_name}</span>,
    },
    { key: 'model_count', header: 'Models', render: (b) => b.model_count },
    { key: 'created_at', header: 'Added', render: (b) => formatDate(b.created_at) },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Tags className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Brands</h2>
            <p className="text-sm text-muted-foreground">Master list of EV manufacturers.</p>
          </div>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Brand
        </Button>
      </div>

      <AdminTable
        columns={columns}
        rows={data?.data}
        isLoading={isLoading}
        error={error}
        getRowKey={(b) => b.id}
        searchKeys={['brand_name']}
        searchPlaceholder="Search brands..."
        emptyLabel="No brands yet"
        actions={(b) => (
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" onClick={() => openEdit(b)} title="Edit">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setDeleting(b)} title="Delete">
              <Trash2 className="h-4 w-4 text-red-600" />
            </Button>
          </div>
        )}
      />

      <Dialog
        open={creating || !!editing}
        onOpenChange={(o) => {
          if (!o) {
            setCreating(false)
            setEditing(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Brand' : 'Add Brand'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Update the brand name.' : 'Add a new EV manufacturer to the master catalog.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-2">
            <Label htmlFor="bname">Brand Name</Label>
            <Input id="bname" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ather Energy" />
            {formError && <p className="text-sm text-red-600">{formError}</p>}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreating(false)
                setEditing(null)
              }}
            >
              Cancel
            </Button>
            <Button onClick={save} disabled={busy}>
              {busy ? 'Saving...' : editing ? 'Save Changes' : 'Add Brand'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Brand</DialogTitle>
            <DialogDescription>
              This permanently deletes {deleting?.brand_name}. Brands with existing vehicle models cannot be deleted.
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
