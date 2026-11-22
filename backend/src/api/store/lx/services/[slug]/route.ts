import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { lx } from "../../../../../lib/lx"
import { pick } from "../route"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const [s] = await lx(req.scope).listPrestations({ slug: req.params.slug, active: true } as any)
  if (!s) return res.status(404).json({ message: "Service introuvable." })
  res.json({ service: pick(s) })
}
