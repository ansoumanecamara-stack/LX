import { lx, norm } from "./lx"

export const SLOTS: Record<string, string> = { morning: "Matin (8h-12h)", afternoon: "Après-midi (12h-17h)", evening: "Soir (17h-20h)", any: "Peu importe" }
export const STATUS: Record<string, string> = { new: "Demande reçue", quoted: "Devis envoyé", confirmed: "Intervention confirmée", in_progress: "Intervention en cours", done: "Terminée", cancelled: "Annulée" }
export const today = () => new Date().toISOString().slice(0, 10)

export async function nextRef(container: any): Promise<string> {
  const all = await lx(container).listServiceBookings({}, { select: ["id", "ref"] })
  const max = all.reduce((m: number, b: any) => Math.max(m, Number(/^SRV-(\d+)$/.exec(b.ref)?.[1] || 0)), 10000)
  return `SRV-${max + 1}`
}
export async function nextWorkerCode(container: any): Promise<string> {
  const all = await lx(container).listWorkers({}, { select: ["id", "code"] })
  const max = all.reduce((m: number, w: any) => Math.max(m, Number(/^OUV-(\d+)$/.exec(w.code)?.[1] || 0)), 0)
  return `OUV-${String(max + 1).padStart(4, "0")}`
}
/** Ce que le client a le droit de voir : pas de note interne, pas de nom ni de téléphone d'ouvrier. */
export const publicBooking = (b: any) => ({
  ref: b.ref, service_name: b.service_name, service_slug: b.service_slug, status: b.status, status_label: STATUS[b.status],
  address: b.address, area: b.area, preferred_date: b.preferred_date, time_slot: b.time_slot, time_slot_label: SLOTS[b.time_slot],
  details: b.details, quote_amount: b.quote_amount, worker_code: b.worker_code, created_at: b.created_at,
})
export const sameClient = (b: any, phone: string) => norm(b.customer_phone).slice(-9) === norm(phone).slice(-9)
