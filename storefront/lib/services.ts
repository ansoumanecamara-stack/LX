import { store } from "./medusa"

export type Service = { id: string; slug: string; name: string; group: string; summary: string; description: string | null; image_url: string | null; icon: string; price_from: number | null; price_note: string | null }
export type Booking = { ref: string; service_name: string; service_slug: string; status: "new" | "quoted" | "confirmed" | "in_progress" | "done" | "cancelled"; status_label: string; address: string; area: string | null; preferred_date: string; time_slot: string; time_slot_label: string; details: string; quote_amount: number | null; worker_code: string | null; created_at: string }

export const SLOTS: [string, string][] = [["morning", "Matin (8h-12h)"], ["afternoon", "Après-midi (12h-17h)"], ["evening", "Soir (17h-20h)"], ["any", "Peu importe"]]
export const listServices = () => store<{ services: Service[] }>("/store/lx/services").then((d) => d.services).catch(() => [] as Service[])
export const getService = (slug: string) => store<{ service: Service }>(`/store/lx/services/${slug}`).then((d) => d.service).catch(() => null)
export const dayLabel = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
export const todayISO = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10) }
