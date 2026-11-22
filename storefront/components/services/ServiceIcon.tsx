import { Droplets, Hammer, Key, Monitor, Paintbrush, Snowflake, Sofa, Sparkles, Sprout, Truck, Tv, Wifi, Wrench, Zap, type LucideIcon } from "lucide-react"

const ICONS: Record<string, LucideIcon> = { wrench: Wrench, zap: Zap, monitor: Monitor, hammer: Hammer, snowflake: Snowflake, paintbrush: Paintbrush, key: Key, sparkles: Sparkles, truck: Truck, sprout: Sprout, tv: Tv, wifi: Wifi, sofa: Sofa, droplets: Droplets }
export default function ServiceIcon({ name, className }: { name: string; className?: string }) {
  const I = ICONS[name] ?? Wrench
  return <I className={className} aria-hidden />
}
