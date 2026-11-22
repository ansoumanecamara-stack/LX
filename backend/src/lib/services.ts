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
  rating: b.rating ?? null, review_text: b.review_text ?? null, can_review: b.status === "done" && b.rating == null,
})

/** Prénom + initiale : on n'affiche jamais le nom complet d'un client. */
export const shortName = (n: string) => { const [f, ...r] = String(n || "").trim().split(/\s+/); return r.length ? `${f} ${r[r.length - 1][0].toUpperCase()}.` : f || "Client" }

/** Note moyenne et derniers avis par service (slug). */
export async function ratingsBySlug(container: any, slug?: string) {
  const rows = (await lx(container).listServiceBookings({ status: "done", ...(slug ? { service_slug: slug } : {}) } as any, { order: { reviewed_at: "DESC" }, take: 1000 })).filter((b: any) => b.rating != null)
  const out: Record<string, { avg: number; count: number; reviews: any[] }> = {}
  for (const b of rows) { const o = (out[b.service_slug] ||= { avg: 0, count: 0, reviews: [] }); o.count++; o.avg += Number(b.rating); if (o.reviews.length < 6 && b.review_text) o.reviews.push({ author: shortName(b.customer_name), rating: Number(b.rating), comment: b.review_text, date: b.reviewed_at }) }
  for (const o of Object.values(out)) o.avg = Math.round((o.avg / o.count) * 10) / 10
  return out
}
export const sameClient = (b: any, phone: string) => norm(b.customer_phone).slice(-9) === norm(phone).slice(-9)

/** Message envoyé à l'ouvrier : tout ce qu'il faut pour intervenir (le client, lui, ne voit que le code ouvrier). */
export const workerMessage = (b: any, name: string, cancelled = false) => cancelled
  ? `Lx : la demande ${b.ref} (${b.service_name}) est annulée. Ne vous déplacez pas.`
  : `🔧 Lx : nouvelle intervention pour vous, ${String(name).split(" ")[0]}.\nRéf. ${b.ref} : ${b.service_name}\nQuand : ${b.preferred_date}, ${SLOTS[b.time_slot]}\nOù : ${b.address}${b.area ? `, ${b.area}` : ""}\nClient : ${b.customer_name}, ${b.customer_phone}\nTravail : ${b.details}\n${b.quote_amount ? `Devis accepté : ${b.quote_amount} FCFA (le client paie après le travail).\n` : ""}Répondez OK à ce message pour confirmer.`
