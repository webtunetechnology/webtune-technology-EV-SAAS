'use client'

import { useState, type ReactNode } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { EmptyState, LoadingState, ErrorState } from './AdminUI'

export type Column<T> = {
  key: string
  header: string
  render?: (row: T) => ReactNode
  className?: string
}

type AdminTableProps<T> = {
  columns: Column<T>[]
  rows: T[] | undefined
  isLoading?: boolean
  error?: unknown
  searchKeys?: (keyof T)[]
  searchPlaceholder?: string
  emptyLabel?: string
  getRowKey: (row: T) => string
  actions?: (row: T) => ReactNode
}

export function AdminTable<T>({
  columns,
  rows,
  isLoading,
  error,
  searchKeys,
  searchPlaceholder = 'Search...',
  emptyLabel = 'No records found',
  getRowKey,
  actions,
}: AdminTableProps<T>) {
  const [query, setQuery] = useState('')

  if (isLoading) return <LoadingState />
  if (error) return <ErrorState />

  const allRows = rows ?? []
  const filtered =
    searchKeys && query.trim()
      ? allRows.filter((row) =>
          searchKeys.some((k) => {
            const v = row[k]
            return v != null && String(v).toLowerCase().includes(query.toLowerCase())
          }),
        )
      : allRows

  return (
    <div className="flex flex-col gap-4">
      {searchKeys && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9"
          />
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                {columns.map((col) => (
                  <th key={col.key} className="px-4 py-3 font-medium text-muted-foreground">
                    {col.header}
                  </th>
                ))}
                {actions && <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (actions ? 1 : 0)} className="px-4 py-10">
                    <EmptyState message={emptyLabel} />
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={getRowKey(row)} className="border-b border-border last:border-0 hover:bg-muted/30">
                    {columns.map((col) => (
                      <td key={col.key} className={`px-4 py-3 text-foreground ${col.className ?? ''}`}>
                        {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '—')}
                      </td>
                    ))}
                    {actions && <td className="px-4 py-3 text-right">{actions(row)}</td>}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} of {allRows.length} record{allRows.length === 1 ? '' : 's'}
      </p>
    </div>
  )
}
