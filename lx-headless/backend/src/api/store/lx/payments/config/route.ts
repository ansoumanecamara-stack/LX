import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { METHOD_IDS, availableMethods, getConfig } from "../../../../../lib/payments"

// Réglages publics : quels moyens et quel calendrier la vitrine doit proposer (jamais de numéros ni de secrets).
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cfg = await getConfig(req.scope), probe = 10000
  const on = (t: "order" | "service") => availableMethods({ ...cfg, products: { online_mode: "lx" }, methods: Object.fromEntries(METHOD_IDS.map((i) => [i, { ...cfg.methods[i], min_amount: 0, max_amount: 0 }])) as any }, t, probe).map((m) => ({ id: m.id, label: m.label }))
  res.json({ products_mode: cfg.products.online_mode, product_methods: on("order"), service_methods: on("service"), services: { timing: cfg.services.timing, deposit_percent: cfg.services.deposit_percent } })
}
