import {
  Car,
  Boxes,
  Users,
  FileText,
  BarChart3,
  Wrench,
  Ticket,
  ShieldCheck,
  Zap,
  Gauge,
  BatteryCharging,
  IndianRupee,
  type LucideIcon,
} from 'lucide-react'

const ICONS: Record<string, LucideIcon> = {
  Car,
  Boxes,
  Users,
  FileText,
  BarChart3,
  Wrench,
  Ticket,
  ShieldCheck,
  Zap,
  Gauge,
  BatteryCharging,
  IndianRupee,
}

/** Resolve a feature icon by name, falling back to a sensible default. */
export function getFeatureIcon(name: string): LucideIcon {
  return ICONS[name] ?? Zap
}
