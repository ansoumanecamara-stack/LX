import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { lx, norm } from "../../../../../lib/lx"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const b = (req.body || {}) as any, d: Record<string, unknown> = {}
  if (b.name !== undefined) d.name = String(b.name).trim().slice(0, 120)
  if (b.phone !== undefined) d.phone = norm(b.phone)
  if (b.trades !== undefined) d.trades = Array.isArray(b.trades) ? b.trades.join(",") : String(b.trades)
  if (b.zone !== undefined) d.zone = b.zone || null
  if (b.notes !== undefined) d.notes = b.notes || null
  if (b.active !== undefined) d.active = !!b.active
  res.json({ worker: await lx(req.scope).updateWorkers({ id: req.params.id, ...d } as any) })
}
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const open = await lx(req.scope).listServiceBookings({ worker_id: req.params.id, status: ["confirmed", "in_progress"] } as any)
  if (open.length) return res.status(409).json({ message: "Cet ouvrier a des interventions en cours. Désactivez-le à la place." })
  await lx(req.scope).deleteWorkers(req.params.id); res.json({ ok: true })
}
