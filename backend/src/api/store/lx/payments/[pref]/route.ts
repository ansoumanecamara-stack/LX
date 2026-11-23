import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { lx, norm } from "../../../../../lib/lx"
import { getConfig, publicPayment } from "../../../../../lib/payments"

// Statut d'un paiement (la vitrine l'interroge pendant l'attente de la confirmation).
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const [p] = await lx(req.scope).listLxPayments({ ref: String(req.params.pref).toUpperCase() } as any)
  if (!p || norm(p.customer_phone).slice(-9) !== norm(String(req.query.phone || "")).slice(-9)) return res.status(404).json({ message: "Paiement introuvable." })
  res.json({ payment: publicPayment(p, await getConfig(req.scope)) })
}
