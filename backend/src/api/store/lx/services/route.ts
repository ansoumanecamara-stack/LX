import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { lx } from "../../../../lib/lx"

const PUBLIC = ["id", "slug", "name", "group", "summary", "description", "image_url", "icon", "price_from", "price_note", "sort"]
export const pick = (s: any) => Object.fromEntries(PUBLIC.map((k) => [k, s[k]]))

// Catalogue public des services à domicile.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const list = (await lx(req.scope).listPrestations({ active: true } as any, { order: { sort: "ASC", name: "ASC" } })).map(pick)
  res.json({ services: list })
}
