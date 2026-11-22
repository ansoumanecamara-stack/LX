import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { lx, waSend } from "../../../../../../lib/lx"
import { publicBooking, sameClient } from "../../../../../../lib/services"

// Le client note l'intervention terminée (une seule fois).
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body || {}) as any, svc = lx(req.scope)
  const [b] = await svc.listServiceBookings({ ref: String(req.params.ref).toUpperCase() } as any)
  if (!b || !sameClient(b, String(body.phone || ""))) return res.status(404).json({ message: "Demande introuvable." })
  if (b.status !== "done") return res.status(409).json({ message: "Vous pourrez donner votre avis une fois l'intervention terminée." })
  if (b.rating != null) return res.status(409).json({ message: "Vous avez déjà donné votre avis." })
  const rating = Math.round(Number(body.rating))
  if (!(rating >= 1 && rating <= 5)) return res.status(400).json({ message: "Choisissez une note de 1 à 5." })
  const text = String(body.comment || "").trim().slice(0, 600) || null
  const u = await svc.updateServiceBookings({ id: b.id, rating, review_text: text, reviewed_at: new Date() } as any)
  if (rating <= 2 && process.env.LX_WA_NUMBER) waSend(process.env.LX_WA_NUMBER, `⚠️ Avis ${rating}/5 sur ${b.ref} (${b.service_name}, ouvrier ${b.worker_code || "?"})${text ? ` : ${text}` : ""}`).catch(() => {})
  res.json({ booking: publicBooking(u) })
}
