import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { cleanPrestation } from "../../../../lib/prestations"
import { lx } from "../../../../lib/lx"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  res.json({ services: await lx(req.scope).listPrestations({}, { order: { sort: "ASC", name: "ASC" } }) })
}
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const d = cleanPrestation((req.body || {}) as any)
    if (!d.name || !d.summary) return res.status(400).json({ message: "Nom et résumé requis." })
    d.slug = d.slug || String(d.name).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    if ((await lx(req.scope).listPrestations({ slug: d.slug } as any)).length) return res.status(409).json({ message: "Un service porte déjà ce nom." })
    res.status(201).json({ service: await lx(req.scope).createPrestations(d as any) })
  } catch (e: any) { res.status(400).json({ message: e.message }) }
}
