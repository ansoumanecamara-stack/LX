import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { lx, waLink } from "../../../../lib/lx"
import { SLOTS, STATUS } from "../../../../lib/services"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = lx(req.scope), filters: any = {}
  if (req.query.status) filters.status = String(req.query.status)
  const bookings = await svc.listServiceBookings(filters, { order: { created_at: "DESC" }, take: 300 })
  const workers = await svc.listWorkers({})
  const byId = new Map(workers.map((w: any) => [w.id, w]))
  res.json({
    bookings: bookings.map((b: any) => ({ ...b, worker: byId.get(b.worker_id) ? { code: byId.get(b.worker_id)!.code, name: byId.get(b.worker_id)!.name, phone: byId.get(b.worker_id)!.phone } : null,
      whatsapp_link: waLink(b.customer_phone, `Bonjour ${b.customer_name}, ici Lx à propos de votre demande ${b.ref} (${b.service_name}).`) })),
    statuses: STATUS, slots: SLOTS,
  })
}
