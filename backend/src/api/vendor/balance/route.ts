import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { lx } from "../../../lib/lx"
import { balances } from "../../../lib/payouts"
import { currentShop } from "../../../lib/vendor"

// Ce que la boutique voit : sa commission, ce que Lx a encaissé pour elle et ses reversements.
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const shop = await currentShop(req), [b] = await balances(req.scope, shop.id)
  const payouts = await lx(req.scope).listPayouts({ shop_id: shop.id } as any, { order: { created_at: "DESC" }, take: 50 })
  res.json({ balance: b, payouts: payouts.map((p: any) => ({ ref: p.ref, direction: p.direction, amount: p.amount, method: p.method, reference: p.reference, created_at: p.created_at })) })
}
