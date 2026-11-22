import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { lx } from "../../../../lib/lx"
import { ratingsBySlug } from "../../../../lib/services"

const PUBLIC = ["id", "slug", "name", "group", "summary", "description", "image_url", "icon", "price_from", "price_note", "sort"]
export const pick = (s: any) => Object.fromEntries(PUBLIC.map((k) => [k, s[k]]))

// Catalogue public des services à domicile.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const list = (await lx(req.scope).listPrestations({ active: true } as any, { order: { sort: "ASC", name: "ASC" } })).map(pick)
  const r = await ratingsBySlug(req.scope)
  res.json({ services: list.map((s: any) => ({ ...s, rating: r[s.slug] ? { avg: r[s.slug].avg, count: r[s.slug].count } : null })) })
}
