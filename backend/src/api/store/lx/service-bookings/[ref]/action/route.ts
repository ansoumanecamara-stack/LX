import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { lx, waSend } from "../../../../../../lib/lx"
import { publicBooking, sameClient } from "../../../../../../lib/services"

// Le client accepte le devis ou annule sa demande.
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body || {}) as any, svc = lx(req.scope)
  const [b] = await svc.listServiceBookings({ ref: String(req.params.ref).toUpperCase() } as any)
  if (!b || !sameClient(b, String(body.phone || ""))) return res.status(404).json({ message: "Demande introuvable." })
  let status: string
  if (body.action === "accept") { if (b.status !== "quoted") return res.status(409).json({ message: "Aucun devis à accepter pour le moment." }); status = "confirmed" }
  else if (body.action === "cancel") { if (!["new", "quoted", "confirmed"].includes(b.status)) return res.status(409).json({ message: "Cette demande ne peut plus être annulée." }); status = "cancelled" }
  else return res.status(400).json({ message: "Action inconnue." })
  const u = await svc.updateServiceBookings({ id: b.id, status } as any)
  if (process.env.LX_WA_NUMBER) waSend(process.env.LX_WA_NUMBER, `Demande ${b.ref} (${b.service_name}) : le client a ${status === "confirmed" ? "accepté le devis" : "annulé"}.`).catch(() => {})
  res.json({ booking: publicBooking(u) })
}
