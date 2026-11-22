import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getCommission, saveCommission } from "../../../../lib/commission"
import { lx } from "../../../../lib/lx"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  res.json({ config: await getCommission(req.scope), shops: (await lx(req.scope).listShops({})).map((s: any) => ({ id: s.id, code: s.code, name: s.name })) })
}
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const ids = (await lx(req.scope).listShops({})).map((s: any) => s.id)
  res.json({ config: await saveCommission(req.scope, req.body, ids) })
}
