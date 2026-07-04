'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Package,
  X,
  Info,
  Gauge,
  BatteryCharging,
  IndianRupee,
  ShieldCheck,
  Check,
} from 'lucide-react'
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
import { adminMutate } from '@/lib/admin-client'
import { cn } from '@/lib/utils'

export type Vehicle = {
  id: string
  brand_id: string
  brand_name?: string | null
  model_name: string
  variant_name: string | null
  vehicle_type: string | null
  ex_showroom_price: number | null
  battery_capacity_kwh: number | null
  range_per_charge_km: number | null
  motor_power_kw: number | null
  charging_time_standard_hrs?: number | null
  charging_time_fast_hrs?: number | null
  top_speed_kmph: number | null
  seating_capacity: number | null
  insurance_amount?: number | null
  rto_charges?: number | null
  vehicle_warranty_years?: number | null
  vehicle_warranty_km?: number | null
  battery_warranty_years?: number | null
  battery_warranty_km?: number | null
  is_active: boolean
  is_discontinued?: boolean
}

export type Brand = { id: string; brand_name: string }

type FormState = {
  brand_id: string
  model_name: string
  variant_name: string
  vehicle_type: string
  ex_showroom_price: string
  battery_capacity_kwh: string
  range_per_charge_km: string
  motor_power_kw: string
  charging_time_standard_hrs: string
  charging_time_fast_hrs: string
  top_speed_kmph: string
  seating_capacity: string
  insurance_amount: string
  rto_charges: string
  vehicle_warranty_years: string
  vehicle_warranty_km: string
  battery_warranty_years: string
  battery_warranty_km: string
  is_active: boolean
  is_discontinued: boolean
}

const emptyForm: FormState = {
  brand_id: '',
  model_name: '',
  variant_name: '',
  vehicle_type: '',
  ex_showroom_price: '',
  battery_capacity_kwh: '',
  range_per_charge_km: '',
  motor_power_kw: '',
  charging_time_standard_hrs: '',
  charging_time_fast_hrs: '',
  top_speed_kmph: '',
  seating_capacity: '',
  insurance_amount: '',
  rto_charges: '',
  vehicle_warranty_years: '',
  vehicle_warranty_km: '',
  battery_warranty_years: '',
  battery_warranty_km: '',
  is_active: true,
  is_discontinued: false,
}

const DEFAULT_VEHICLE_TYPES = ['Scooter', 'Motorcycle', 'Car', 'Auto Rickshaw', 'Bicycle', 'Truck']

const SECTIONS = [
  { id: 'basic', label: 'Basic Info', icon: Info, heading: 'Basic Information', desc: 'Core identity of the model — brand, name, variant, and type.' },
  { id: 'performance', label: 'Performance', icon: Gauge, heading: 'Performance & Specs', desc: 'Battery, range, motor and other performance metrics.' },
  { id: 'charging', label: 'Charging', icon: BatteryCharging, heading: 'Charging', desc: 'Standard and fast charging times for this model.' },
  { id: 'pricing', label: 'Pricing', icon: IndianRupee, heading: 'Pricing & Charges', desc: 'Ex-showroom price along with insurance and RTO charges.' },
  { id: 'warranty', label: 'Warranty', icon: ShieldCheck, heading: 'Warranty', desc: 'Vehicle and battery warranty coverage.' },
] as const

type SectionId = (typeof SECTIONS)[number]['id']

const fieldLabel = 'text-xs font-semibold uppercase tracking-wide text-muted-foreground'

function num(s: string) {
  return s.trim() ? Number(s) : null
}

export function VehicleFormModal({
  open,
  onClose,
  editing,
  brands,
  onSaved,
  vehicleTypes = DEFAULT_VEHICLE_TYPES,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  editing: Vehicle | null
  brands: Brand[]
  onSaved: () => void
  /** Override the list of selectable vehicle types (defaults to the admin catalog list). */
  vehicleTypes?: string[]
  /** Custom persistence handler. When provided it is used instead of the default admin API call. */
  onSubmit?: (payload: Record<string, unknown>, editing: Vehicle | null) => Promise<void>
}) {
  const [form, setForm] = useState<FormState>(emptyForm)
  const [active, setActive] = useState<SectionId>('basic')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setActive('basic')
    setError('')
    if (editing) {
      const s = (v: number | null | undefined) => (v != null ? String(v) : '')
      setForm({
        brand_id: editing.brand_id || '',
        model_name: editing.model_name || '',
        variant_name: editing.variant_name || '',
        vehicle_type: editing.vehicle_type || '',
        ex_showroom_price: s(editing.ex_showroom_price),
        battery_capacity_kwh: s(editing.battery_capacity_kwh),
        range_per_charge_km: s(editing.range_per_charge_km),
        motor_power_kw: s(editing.motor_power_kw),
        charging_time_standard_hrs: s(editing.charging_time_standard_hrs),
        charging_time_fast_hrs: s(editing.charging_time_fast_hrs),
        top_speed_kmph: s(editing.top_speed_kmph),
        seating_capacity: s(editing.seating_capacity),
        insurance_amount: s(editing.insurance_amount),
        rto_charges: s(editing.rto_charges),
        vehicle_warranty_years: s(editing.vehicle_warranty_years),
        vehicle_warranty_km: s(editing.vehicle_warranty_km),
        battery_warranty_years: s(editing.battery_warranty_years),
        battery_warranty_km: s(editing.battery_warranty_km),
        is_active: editing.is_active ?? true,
        is_discontinued: editing.is_discontinued ?? false,
      })
    } else {
      setForm(emptyForm)
    }
  }, [open, editing])

  const activeIndex = useMemo(() => SECTIONS.findIndex((s) => s.id === active), [active])
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  if (!open) return null

  const save = async () => {
    if (!form.brand_id || !form.model_name.trim() || !form.vehicle_type) {
      setActive('basic')
      setError('Brand, model name, and vehicle type are required.')
      return
    }
    setBusy(true)
    setError('')
    const payload = {
      brand_id: form.brand_id,
      model_name: form.model_name.trim(),
      variant_name: form.variant_name.trim() || null,
      vehicle_type: form.vehicle_type,
      ex_showroom_price: num(form.ex_showroom_price),
      battery_capacity_kwh: num(form.battery_capacity_kwh),
      range_per_charge_km: num(form.range_per_charge_km),
      motor_power_kw: num(form.motor_power_kw),
      charging_time_standard_hrs: num(form.charging_time_standard_hrs),
      charging_time_fast_hrs: num(form.charging_time_fast_hrs),
      top_speed_kmph: num(form.top_speed_kmph),
      seating_capacity: num(form.seating_capacity),
      insurance_amount: num(form.insurance_amount),
      rto_charges: num(form.rto_charges),
      vehicle_warranty_years: num(form.vehicle_warranty_years),
      vehicle_warranty_km: num(form.vehicle_warranty_km),
      battery_warranty_years: num(form.battery_warranty_years),
      battery_warranty_km: num(form.battery_warranty_km),
      is_active: form.is_active,
      is_discontinued: form.is_discontinued,
    }
    try {
      if (onSubmit) {
        await onSubmit(payload, editing)
      } else if (editing) {
        await adminMutate(`/api/admin/vehicles/${editing.id}`, 'PATCH', payload)
      } else {
        await adminMutate('/api/admin/vehicles', 'POST', payload)
      }
      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save vehicle')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-2 md:p-6">
      <div className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4 md:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground md:text-xl">
                {editing ? 'Edit Vehicle Model' : 'Add New Vehicle Model'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {editing
                  ? 'Update the details of this model in the master catalog.'
                  : 'Fill in the details below to add a new model to the catalog.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={save} disabled={busy}>
              {busy ? 'Saving...' : editing ? 'Save Changes' : 'Save Model'}
            </Button>
            <button
              onClick={onClose}
              aria-label="Close"
              className="ml-1 flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex min-h-0 flex-1">
          {/* Sidebar stepper */}
          <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-border bg-muted/30 p-4 md:flex">
            <nav className="flex flex-col gap-1">
              {SECTIONS.map((s, i) => {
                const isActive = s.id === active
                const isDone = i < activeIndex
                return (
                  <button
                    key={s.id}
                    onClick={() => setActive(s.id)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                      isActive ? 'bg-primary/10' : 'hover:bg-muted'
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : isDone
                            ? 'bg-primary/20 text-primary'
                            : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {isDone ? <Check className="h-3.5 w-3.5" /> : i + 1}
                    </span>
                    <span
                      className={cn(
                        'text-sm font-medium',
                        isActive ? 'text-primary' : 'text-foreground'
                      )}
                    >
                      {s.label}
                    </span>
                  </button>
                )
              })}
            </nav>

            <div className="rounded-xl border border-border bg-background p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                {activeIndex + 1} / {SECTIONS.length} sections
              </p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${((activeIndex + 1) / SECTIONS.length) * 100}%` }}
                />
              </div>
            </div>
          </aside>

          {/* Content */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto max-w-3xl p-5 md:p-8">
              {/* Mobile section tabs */}
              <div className="mb-6 flex gap-2 overflow-x-auto md:hidden">
                {SECTIONS.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => setActive(s.id)}
                    className={cn(
                      'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium',
                      s.id === active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {i + 1}. {s.label}
                  </button>
                ))}
              </div>

              <div className="mb-6">
                <h3 className="text-xl font-bold text-foreground">{SECTIONS[activeIndex].heading}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{SECTIONS[activeIndex].desc}</p>
              </div>

              {error && (
                <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {active === 'basic' && (
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-2">
                    <Label className={fieldLabel}>Brand *</Label>
                    <Select value={form.brand_id} onValueChange={(v) => set('brand_id', v)}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select a brand" />
                      </SelectTrigger>
                      <SelectContent>
                        {brands.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.brand_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className={fieldLabel} htmlFor="model_name">Model Name *</Label>
                    <Input
                      id="model_name"
                      className="h-11"
                      placeholder="e.g. Nexon EV Max"
                      value={form.model_name}
                      onChange={(e) => set('model_name', e.target.value)}
                    />
                  </div>
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <Label className={fieldLabel} htmlFor="variant_name">Variant</Label>
                      <Input
                        id="variant_name"
                        className="h-11"
                        placeholder="e.g. Empowered+ 3.3"
                        value={form.variant_name}
                        onChange={(e) => set('variant_name', e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label className={fieldLabel}>Vehicle Type *</Label>
                      <Select value={form.vehicle_type} onValueChange={(v) => set('vehicle_type', v)}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {vehicleTypes.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className={fieldLabel}>Availability</Label>
                    <div className="flex flex-wrap gap-3">
                      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-primary"
                          checked={form.is_active}
                          onChange={(e) => set('is_active', e.target.checked)}
                        />
                        <span className="text-foreground">Active (listed in catalog)</span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-primary"
                          checked={form.is_discontinued}
                          onChange={(e) => set('is_discontinued', e.target.checked)}
                        />
                        <span className="text-foreground">Discontinued</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {active === 'performance' && (
                <div className="grid gap-5 md:grid-cols-2">
                  <NumberField label="Battery Capacity (kWh)" value={form.battery_capacity_kwh} onChange={(v) => set('battery_capacity_kwh', v)} placeholder="e.g. 40.5" />
                  <NumberField label="Range per Charge (km)" value={form.range_per_charge_km} onChange={(v) => set('range_per_charge_km', v)} placeholder="e.g. 437" />
                  <NumberField label="Motor Power (kW)" value={form.motor_power_kw} onChange={(v) => set('motor_power_kw', v)} placeholder="e.g. 105" />
                  <NumberField label="Top Speed (km/h)" value={form.top_speed_kmph} onChange={(v) => set('top_speed_kmph', v)} placeholder="e.g. 140" />
                  <NumberField label="Seating Capacity" value={form.seating_capacity} onChange={(v) => set('seating_capacity', v)} placeholder="e.g. 5" />
                </div>
              )}

              {active === 'charging' && (
                <div className="grid gap-5 md:grid-cols-2">
                  <NumberField label="Standard Charging Time (hrs)" value={form.charging_time_standard_hrs} onChange={(v) => set('charging_time_standard_hrs', v)} placeholder="e.g. 8.5" />
                  <NumberField label="Fast Charging Time (hrs)" value={form.charging_time_fast_hrs} onChange={(v) => set('charging_time_fast_hrs', v)} placeholder="e.g. 1" />
                </div>
              )}

              {active === 'pricing' && (
                <div className="grid gap-5 md:grid-cols-2">
                  <NumberField label="Ex-Showroom Price (₹)" value={form.ex_showroom_price} onChange={(v) => set('ex_showroom_price', v)} placeholder="e.g. 1699000" />
                  <NumberField label="Insurance Amount (₹)" value={form.insurance_amount} onChange={(v) => set('insurance_amount', v)} placeholder="e.g. 55000" />
                  <NumberField label="RTO Charges (₹)" value={form.rto_charges} onChange={(v) => set('rto_charges', v)} placeholder="e.g. 25000" />
                </div>
              )}

              {active === 'warranty' && (
                <div className="grid gap-5 md:grid-cols-2">
                  <NumberField label="Vehicle Warranty (Years)" value={form.vehicle_warranty_years} onChange={(v) => set('vehicle_warranty_years', v)} placeholder="e.g. 3" />
                  <NumberField label="Vehicle Warranty (km)" value={form.vehicle_warranty_km} onChange={(v) => set('vehicle_warranty_km', v)} placeholder="e.g. 125000" />
                  <NumberField label="Battery Warranty (Years)" value={form.battery_warranty_years} onChange={(v) => set('battery_warranty_years', v)} placeholder="e.g. 8" />
                  <NumberField label="Battery Warranty (km)" value={form.battery_warranty_km} onChange={(v) => set('battery_warranty_km', v)} placeholder="e.g. 160000" />
                </div>
              )}

              {/* Footer nav */}
              <div className="mt-8 flex items-center justify-between border-t border-border pt-5">
                <Button
                  variant="outline"
                  disabled={activeIndex === 0}
                  onClick={() => setActive(SECTIONS[Math.max(0, activeIndex - 1)].id)}
                >
                  Previous
                </Button>
                {activeIndex < SECTIONS.length - 1 ? (
                  <Button onClick={() => setActive(SECTIONS[activeIndex + 1].id)}>Next</Button>
                ) : (
                  <Button onClick={save} disabled={busy}>
                    {busy ? 'Saving...' : editing ? 'Save Changes' : 'Save Model'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function NumberField({
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
  return (
    <div className="flex flex-col gap-2">
      <Label className={fieldLabel}>{label}</Label>
      <Input
        type="number"
        className="h-11"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
