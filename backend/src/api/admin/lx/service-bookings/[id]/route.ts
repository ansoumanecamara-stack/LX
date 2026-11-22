import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { lx, waSend } from "../../../../../lib/lx"
import { SLOTS, STATUS } from "../../../../../lib/services"

// Le conseiller Lx fixe le devis, affecte un ouvrier, fait avancer le statut.
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const b = (req.body || {}) as any, svc = lx(req.scope), [cur] = await svc.listServiceBookings({ id: req.params.id } as any)
  if (!cur) return res.status(404).json({ message: "Demande introuvable." })
  const d: Record<string, unknown> = {}
  if (b.status !== undefined) { if (!STATUS[b.status]) return res.status(400).json({ message: "Statut inconnu." }); d.status = b.status }
  if (b.quote_amount !== undefined) {
    d.quote_amount = b.quote_amount === null || b.quote_amount === "" ? null : Math.max(0, Math.round(Number(b.quote_amount) || 0))
    if (d.quote_amount && b.status === undefined && cur.status === "new") d.status = "quoted"
  }
  if (b.worker_id !== undefined) {
    if (!b.worker_id) { d.worker_id = null; d.worker_code = null }
    else { const [w] = await svc.listWorkers({ id: b.worker_id } as any); if (!w || !w.active) return res.status(400).json({ message: "Ouvrier introuvable ou inactif." }); d.worker_id = w.id; d.worker_code = w.code }
  }
  if (b.admin_note !== undefined) d.admin_note = b.admin_note ? String(b.admin_note).slice(0, 1000) : null
  if (b.preferred_date !== undefined && /^\d{4}-\d{2}-\d{2}$/.test(b.preferred_date)) d.preferred_date = b.preferred_date
  if (b.time_slot !== undefined && SLOTS[b.time_slot]) d.time_slot = b.time_slot
  if (d.status === "confirmed" && !(d.worker_id ?? cur.worker_id)) return res.status(400).json({ message: "Affectez d'abord un ouvrier." })
  const u = await svc.updateServiceBookings({ id: cur.id, ...d } as any)
  // Prévenir le client par WhatsApp (si l'API est configurée) quand le devis ou le statut change
  if (u.status !== cur.status || (d.quote_amount && d.quote_amount !== cur.quote_amount)) {
    const link = `${process.env.LX_STOREFRONT_URL || ""}/services/suivi?ref=${u.ref}`
    const txt = u.status === "quoted" ? `Lx : devis pour votre demande ${u.ref} : ${u.quote_amount} FCFA. Acceptez-le ici : ${link}` : `Lx : demande ${u.ref}, ${STATUS[u.status]}${u.worker_code ? ` (ouvrier ${u.worker_code})` : ""}. ${link}`
    waSend(u.customer_phone, txt).catch(() => {})
  }
  res.json({ booking: u })
}
