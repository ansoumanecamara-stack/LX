import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { lx } from "../../../../lib/lx"
import { markPaid, verifyWaveWebhook } from "../../../../lib/payments"

// Webhook Wave : confirme automatiquement les paiements du mode « API ».
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const raw = (req as any).rawBody ? (req as any).rawBody.toString("utf8") : JSON.stringify(req.body || {})
  if (!verifyWaveWebhook(req.headers as any, raw)) return res.status(401).json({ message: "Signature invalide." })
  const ev = (req.body || {}) as any, d = ev.data || {}, svc = lx(req.scope)
  if (!["checkout.session.completed", "checkout.session.payment_failed"].includes(ev.type)) return res.json({ ok: true, ignored: true })
  const [p] = d.client_reference ? await svc.listLxPayments({ ref: String(d.client_reference) } as any) : await svc.listLxPayments({ provider_id: String(d.id) } as any)
  if (!p) return res.json({ ok: true, unknown: true })
  if (ev.type === "checkout.session.payment_failed") { if (p.status === "pending") await svc.updateLxPayments({ id: p.id, status: "failed" } as any); return res.json({ ok: true }) }
  // Contrôles : le montant et la devise doivent correspondre à ce que nous avons demandé
  if (d.payment_status !== "succeeded" || Number(d.amount) !== p.charged || (d.currency && d.currency !== "XOF")) {
    await svc.updateLxPayments({ id: p.id, note: [p.note, `Webhook refusé : montant ou statut inattendu (${d.amount} ${d.currency}, ${d.payment_status})`].filter(Boolean).join(" | ") } as any)
    return res.status(422).json({ message: "Montant inattendu." })
  }
  await svc.updateLxPayments({ id: p.id, reference: d.transaction_id ? String(d.transaction_id) : p.reference } as any)
  await markPaid(req.scope, p.id, "Wave (webhook)")
  res.json({ ok: true })
}
