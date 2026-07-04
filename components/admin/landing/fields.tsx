'use client'

import { ArrowDown, ArrowUp, Trash2, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

let uid = 0
const nextId = () => `f${++uid}`

export function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const id = nextId()
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      <Input id={id} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

export function AreaField({
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  rows?: number
  placeholder?: string
}) {
  const id = nextId()
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      <Textarea id={id} value={value} rows={rows} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

/** A bordered card wrapping one item in a repeatable list, with reorder/remove controls. */
export function ItemRow({
  title,
  index,
  count,
  onMove,
  onRemove,
  children,
}: {
  title: string
  index: number
  count: number
  onMove: (from: number, to: number) => void
  onRemove: (index: number) => void
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={index === 0}
            onClick={() => onMove(index, index - 1)}
            title="Move up"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={index === count - 1}
            onClick={() => onMove(index, index + 1)}
            title="Move down"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onRemove(index)}
            title="Remove"
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  )
}

export function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick} className="self-start">
      <Plus className="mr-1.5 h-4 w-4" />
      {label}
    </Button>
  )
}

/** Immutable array move helper. */
export function moveItem<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr
  const copy = [...arr]
  const [item] = copy.splice(from, 1)
  copy.splice(to, 0, item)
  return copy
}
