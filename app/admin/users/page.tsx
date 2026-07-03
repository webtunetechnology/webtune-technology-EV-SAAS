'use client'

import useSWR from 'swr'
import { useState } from 'react'
import { Users, Pencil, Trash2, Power } from 'lucide-react'
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
import { fetcher, adminMutate, formatDate } from '@/lib/admin-client'

type AdminUserRow = {
  id: string
  full_name: string | null
  email: string | null
  mobile_number: string | null
  role: string
  is_active: boolean
  created_at: string
  showroom: { showroom_name: string | null } | null
}

const ROLES = ['admin', 'showroom_owner', 'vendor', 'staff']

export default function UsersPage() {
  const { data, error, isLoading, mutate } = useSWR<{ data: AdminUserRow[] }>('/api/admin/users', fetcher)
  const [editing, setEditing] = useState<AdminUserRow | null>(null)
  const [deleting, setDeleting] = useState<AdminUserRow | null>(null)
  const [form, setForm] = useState({ full_name: '', role: 'staff', password: '' })
  const [busy, setBusy] = useState(false)

  const openEdit = (u: AdminUserRow) => {
    setEditing(u)
    setForm({ full_name: u.full_name || '', role: u.role || 'staff', password: '' })
  }

  const saveEdit = async () => {
    if (!editing) return
    setBusy(true)
    const payload: Record<string, unknown> = { full_name: form.full_name, role: form.role }
    if (form.password.trim()) payload.new_password = form.password
    await adminMutate(`/api/admin/users/${editing.id}`, 'PATCH', payload)
    setBusy(false)
    setEditing(null)
    mutate()
  }

  const toggleActive = async (u: AdminUserRow) => {
    await adminMutate(`/api/admin/users/${u.id}`, 'PATCH', { is_active: !u.is_active })
    mutate()
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setBusy(true)
    await adminMutate(`/api/admin/users/${deleting.id}`, 'DELETE')
    setBusy(false)
    setDeleting(null)
    mutate()
  }

  const columns: Column<AdminUserRow>[] = [
    {
      key: 'full_name',
      header: 'User',
      render: (u) => (
        <div>
          <p className="font-medium text-foreground">{u.full_name || '—'}</p>
          <p className="text-xs text-muted-foreground">{u.email || u.mobile_number || '—'}</p>
        </div>
      ),
    },
    { key: 'showroom_name', header: 'Showroom', render: (u) => u.showroom?.showroom_name || '—' },
    {
      key: 'role',
      header: 'Role',
      render: (u) => <span className="capitalize">{(u.role || '').replace(/_/g, ' ')}</span>,
    },
    { key: 'created_at', header: 'Joined', render: (u) => formatDate(u.created_at) },
    {
      key: 'is_active',
      header: 'Status',
      render: (u) => <StatusBadge status={u.is_active ? 'active' : 'suspended'} />,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Platform Users</h2>
          <p className="text-sm text-muted-foreground">Every account across all showrooms.</p>
        </div>
      </div>

      <AdminTable
        columns={columns}
        rows={data?.data}
        isLoading={isLoading}
        error={error}
        getRowKey={(u) => u.id}
        searchKeys={['full_name', 'email', 'mobile_number', 'role']}
        searchPlaceholder="Search users by name, email, showroom..."
        emptyLabel="No users yet"
        actions={(u) => (
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" onClick={() => openEdit(u)} title="Edit">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => toggleActive(u)} title={u.is_active ? 'Suspend' : 'Activate'}>
              <Power className={`h-4 w-4 ${u.is_active ? 'text-amber-600' : 'text-emerald-600'}`} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setDeleting(u)} title="Delete">
              <Trash2 className="h-4 w-4 text-red-600" />
            </Button>
          </div>
        )}
      />

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update {editing?.full_name || 'this user'}.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="fname">Full Name</Label>
              <Input id="fname" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r} className="capitalize">
                      {r.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="pwd">Reset Password</Label>
              <Input
                id="pwd"
                type="password"
                placeholder="Leave blank to keep current"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={busy}>{busy ? 'Saving...' : 'Save Changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              This permanently deletes {deleting?.full_name || 'this user'}. This cannot be undone.
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
