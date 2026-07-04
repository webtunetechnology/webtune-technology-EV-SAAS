export const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'include' })
  if (res.status === 401) {
    if (typeof window !== 'undefined') window.location.replace('/admin/login')
    throw new Error('Unauthorized')
  }
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Request failed')
  return json
}

export async function adminMutate(
  url: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  body?: any
) {
  const res = await fetch(url, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Request failed')
  return json
}

export function formatCurrency(value: number | null | undefined) {
  const n = Number(value) || 0
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n)
}

export function formatDate(value: string | null | undefined) {
  if (!value) return '-'
  const d = new Date(value)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}
