import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { cleanPrestation } from "../../../../../lib/prestations"
import { lx } from "../../../../../lib/lx"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try { const d = cleanPrestation((req.body || {}) as any); delete d.slug; res.json({ service: await lx(req.scope).updatePrestations({ id: req.params.id, ...d } as any) }) } catch (e: any) { res.status(400).json({ message: e.message }) }
}
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const open = await lx(req.scope).listServiceBookings({ prestation_id: req.params.id, status: ["new", "quoted", "confirmed", "in_progress"] } as any)
  if (open.length) return res.status(409).json({ message: `Impossible : ${open.length} demande(s) en cours. Désactivez le service à la place.` })
  await lx(req.scope).deletePrestations(req.params.id); res.json({ ok: true })
}
