import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { lx } from "../../../../../lib/lx"
import { markPaid } from "../../../../../lib/payments"

// Vérification manuelle d'un paiement : confirmer, rejeter, rembourser ou annoter.
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const b = (req.body || {}) as any, svc = lx(req.scope), p = await svc.retrieveLxPayment(req.params.id).catch(() => null)
  if (!p) return res.status(404).json({ message: "Paiement introuvable." })
  const note = (t: string) => [p.note, t].filter(Boolean).join(" | ")
  if (b.action === "confirm") { if (p.status === "paid") return res.status(409).json({ message: "Déjà confirmé." }); return res.json({ payment: await markPaid(req.scope, p.id, "l'équipe Lx") }) }
  if (b.action === "reject") { if (p.status === "paid") return res.status(409).json({ message: "Paiement déjà confirmé : utilisez le remboursement." }); return res.json({ payment: await svc.updateLxPayments({ id: p.id, status: "failed", note: note(`Rejeté${b.note ? " : " + String(b.note).slice(0, 200) : ""}`) } as any) }) }
  if (b.action === "refund") {
    if (p.status !== "paid") return res.status(409).json({ message: "Seul un paiement confirmé peut être remboursé." })
    const u = await svc.updateLxPayments({ id: p.id, status: "refunded", note: note(`Remboursé${b.note ? " : " + String(b.note).slice(0, 200) : ""}`) } as any)
    if (p.target_type === "order") for (const r of await svc.listShopOrders({ order_display_id: Number(p.target_ref) } as any)) await svc.updateShopOrders({ id: r.id, payment_status: "unpaid" } as any)
    return res.json({ payment: u })
  }
  if (b.action === "note") return res.json({ payment: await svc.updateLxPayments({ id: p.id, note: String(b.note || "").slice(0, 500) || null } as any) })
  res.status(400).json({ message: "Action inconnue." })
}
