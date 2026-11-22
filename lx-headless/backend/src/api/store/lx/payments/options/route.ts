import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveTarget } from "../../../../../lib/pay-targets"
import { availableMethods, expireOld, getConfig, publicPayment } from "../../../../../lib/payments"
import { lx } from "../../../../../lib/lx"

// Ce que le client peut payer maintenant pour une commande ou une demande de service.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  await expireOld(req.scope)
  const cfg = await getConfig(req.scope), type = String(req.query.type || ""), t = await resolveTarget(req.scope, cfg, type, String(req.query.ref || ""), String(req.query.phone || ""))
  if (!t) return res.status(404).json({ message: "Introuvable." })
  const pays = await lx(req.scope).listLxPayments({ target_type: t.type, target_ref: t.ref } as any, { order: { created_at: "DESC" }, take: 20 })
  res.json({ total: t.total, paid: t.paid, due: t.due, kind: t.kind, methods: availableMethods(cfg, t.type, t.due), pending: pays.filter((p: any) => p.status === "pending").map((p: any) => publicPayment(p, cfg))[0] ?? null, thanks: cfg.thanks_message })
}
