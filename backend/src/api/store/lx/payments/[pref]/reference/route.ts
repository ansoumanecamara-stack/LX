import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { lx, norm, waSend } from "../../../../../../lib/lx"
import { getConfig, publicPayment } from "../../../../../../lib/payments"

// Le client indique la référence de sa transaction (SMS Wave / Orange Money) : l'équipe Lx la vérifie.
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const b = (req.body || {}) as any, svc = lx(req.scope)
  const [p] = await svc.listLxPayments({ ref: String(req.params.pref).toUpperCase() } as any)
  if (!p || norm(p.customer_phone).slice(-9) !== norm(String(b.phone || "")).slice(-9)) return res.status(404).json({ message: "Paiement introuvable." })
  if (p.status !== "pending") return res.status(409).json({ message: p.status === "paid" ? "Ce paiement est déjà confirmé." : "Ce paiement n'est plus en attente. Recommencez." })
  const reference = String(b.reference || "").trim().toUpperCase().slice(0, 60)
  if (reference.length < 4) return res.status(400).json({ message: "Saisissez la référence reçue par SMS (4 caractères minimum)." })
  const dup = (await svc.listLxPayments({ reference } as any)).find((x: any) => x.id !== p.id && x.status !== "failed")
  if (dup) return res.status(409).json({ message: "Cette référence est déjà utilisée pour un autre paiement." })
  const u = await svc.updateLxPayments({ id: p.id, reference } as any)
  if (process.env.LX_WA_NUMBER) waSend(process.env.LX_WA_NUMBER, `💳 Paiement ${p.ref} à vérifier : ${p.charged} FCFA (${p.method}), réf. ${reference}, pour ${p.target_type === "order" ? `commande #${p.target_ref}` : p.target_ref}.`).catch(() => {})
  res.json({ payment: publicPayment(u, await getConfig(req.scope)) })
}
