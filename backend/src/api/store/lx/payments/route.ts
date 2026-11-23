import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { lx } from "../../../../lib/lx"
import { resolveTarget } from "../../../../lib/pay-targets"
import { availableMethods, chargedOf, expireOld, feeOf, fill, getConfig, nextPayRef, publicPayment, waveCreateSession } from "../../../../lib/payments"

// Le client choisit un moyen de paiement : on crée (ou on reprend) le paiement en attente.
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const b = (req.body || {}) as any, svc = lx(req.scope)
  await expireOld(req.scope)
  const cfg = await getConfig(req.scope), t = await resolveTarget(req.scope, cfg, String(b.type), String(b.ref || ""), String(b.phone || ""))
  if (!t) return res.status(404).json({ message: "Introuvable." })
  if (t.due <= 0) return res.status(409).json({ message: "Rien à payer pour le moment." })
  const opt = availableMethods(cfg, t.type, t.due).find((m) => m.id === b.method)
  if (!opt) return res.status(400).json({ message: "Ce moyen de paiement n'est pas disponible pour ce montant." })
  const m = (cfg.methods as any)[opt.id], kind = t.kind
  const existing = (await svc.listLxPayments({ target_type: t.type, target_ref: t.ref, status: "pending" } as any))
  const same = existing.find((p: any) => p.method === opt.id && p.amount === t.due && p.kind === kind && (!p.expires_at || new Date(p.expires_at) > new Date()))
  if (same) return res.json({ payment: publicPayment(same, cfg), thanks: cfg.thanks_message })
  for (const p of existing) if (!p.reference) await svc.updateLxPayments({ id: p.id, status: "expired" } as any)
  const ref = await nextPayRef(req.scope)
  let checkout_url: string | null = null, provider_id: string | null = null
  if (m.mode === "link") checkout_url = fill(m.link_template, { amount: opt.charged, ref, phone: t.phone })
  if (m.mode === "api") {
    const site = (process.env.LX_STOREFRONT_URL || "").replace(/\/$/, "")
    if (!site) return res.status(503).json({ message: "Paiement indisponible : LX_STOREFRONT_URL n'est pas configuré." })
    try { const s = await waveCreateSession({ amount: opt.charged, ref, phone: t.phone, success_url: site + t.return_path, error_url: site + t.return_path + "&pay=echec" }); checkout_url = s.url; provider_id = s.id }
    catch (e: any) { return res.status(502).json({ message: "Wave est indisponible pour le moment. Réessayez ou choisissez un autre moyen." }) }
  }
  const p = await svc.createLxPayments({ ref, target_type: t.type, target_ref: t.ref, customer_phone: t.phone, method: opt.id, mode: m.mode, kind, amount: t.due, fee: feeOf(m, t.due), charged: chargedOf(m, t.due), checkout_url, provider_id, expires_at: new Date(Date.now() + m.expire_hours * 3600_000) } as any)
  res.status(201).json({ payment: publicPayment(p, cfg), thanks: cfg.thanks_message })
}
