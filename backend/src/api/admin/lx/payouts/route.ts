import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { lx } from "../../../../lib/lx"
import { balances, nextPayoutRef } from "../../../../lib/payouts"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const [b, payouts] = await Promise.all([balances(req.scope), lx(req.scope).listPayouts({}, { order: { created_at: "DESC" }, take: 200 })])
  const code = new Map(b.map((x) => [x.shop_id, x.code]))
  res.json({ balances: b.sort((x, y) => Math.abs(y.balance) - Math.abs(x.balance)), payouts: payouts.map((p: any) => ({ ...p, shop_code: code.get(p.shop_id) ?? "?" })),
    totals: { owed_to_shops: b.filter((x) => x.balance > 0).reduce((s, x) => s + x.balance, 0), owed_by_shops: -b.filter((x) => x.balance < 0).reduce((s, x) => s + x.balance, 0), commission: b.reduce((s, x) => s + x.commission + x.pos_commission, 0) } })
}
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const b = (req.body || {}) as any, svc = lx(req.scope), amount = Math.round(Number(b.amount))
  const [shop] = await svc.listShops({ id: String(b.shop_id) } as any)
  if (!shop) return res.status(404).json({ message: "Boutique introuvable." })
  if (!(amount > 0)) return res.status(400).json({ message: "Montant invalide." })
  const p = await svc.createPayouts({ ref: await nextPayoutRef(req.scope), shop_id: shop.id, direction: b.direction === "from_shop" ? "from_shop" : "to_shop", amount, method: ["wave", "orange_money", "cash", "bank"].includes(b.method) ? b.method : "cash", reference: b.reference ? String(b.reference).slice(0, 60) : null, note: b.note ? String(b.note).slice(0, 300) : null } as any)
  res.status(201).json({ payout: p })
}
