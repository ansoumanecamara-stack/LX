import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { lx, validPhone, norm } from "../../../../lib/lx"
import { nextWorkerCode } from "../../../../lib/services"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  res.json({ workers: await lx(req.scope).listWorkers({}, { order: { code: "ASC" } }) })
}
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const b = (req.body || {}) as any
  if (!String(b.name || "").trim()) return res.status(400).json({ message: "Nom requis." })
  if (!validPhone(b.phone || "")) return res.status(400).json({ message: "Téléphone invalide." })
  const w = await lx(req.scope).createWorkers({ code: await nextWorkerCode(req.scope), name: String(b.name).trim().slice(0, 120), phone: norm(b.phone), trades: Array.isArray(b.trades) ? b.trades.join(",") : String(b.trades || ""), zone: b.zone || null, notes: b.notes || null } as any)
  res.status(201).json({ worker: w })
}
