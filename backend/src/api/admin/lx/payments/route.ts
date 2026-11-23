import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { lx } from "../../../../lib/lx"
import { resolveTarget } from "../../../../lib/pay-targets"
import { expireOld, getConfig, markPaid, nextPayRef } from "../../../../lib/payments"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  await expireOld(req.scope)
  const f: any = {}; for (const k of ["status", "target_type", "method"]) if (req.query[k]) f[k] = String(req.query[k])
  const all = await lx(req.scope).listLxPayments({}, { order: { created_at: "DESC" }, take: 1000 })
  const rows = all.filter((p: any) => Object.entries(f).every(([k, v]) => p[k] === v))
  const paid = all.filter((p: any) => p.status === "paid"), sum = (a: any[], k: string) => a.reduce((s, p) => s + p[k], 0)
  res.json({ payments: rows.slice(0, 300), summary: {
    paid_total: sum(paid, "amount"), fees_total: sum(paid, "fee"), paid_count: paid.length,
    by_method: Object.fromEntries(["wave", "orange_money", "cash"].map((m) => [m, sum(paid.filter((p: any) => p.method === m), "amount")])),
    to_verify: all.filter((p: any) => p.status === "pending" && p.reference).length, pending: all.filter((p: any) => p.status === "pending").length,
  } })
}

// Encaissement saisi par l'équipe (espèces, ou paiement mobile reçu hors ligne).
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const b = (req.body || {}) as any, cfg = await getConfig(req.scope)
  const t = await resolveTarget(req.scope, cfg, String(b.type), String(b.ref || ""))
  if (!t) return res.status(404).json({ message: "Commande ou demande introuvable." })
  const amount = Math.round(Number(b.amount))
  if (!(amount > 0)) return res.status(400).json({ message: "Montant invalide." })
  const method = ["cash", "wave", "orange_money"].includes(b.method) ? b.method : "cash"
  const p = await lx(req.scope).createLxPayments({ ref: await nextPayRef(req.scope), target_type: t.type, target_ref: t.ref, customer_phone: t.phone, method, mode: "cash", kind: amount >= t.total ? "full" : "deposit", amount, fee: 0, charged: amount, reference: b.reference ? String(b.reference).slice(0, 60) : null, note: b.note ? String(b.note).slice(0, 300) : "Saisi par l'équipe" } as any)
  res.status(201).json({ payment: await markPaid(req.scope, p.id, "l'équipe Lx") })
}
