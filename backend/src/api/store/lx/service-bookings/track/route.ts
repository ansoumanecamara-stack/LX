import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { lx } from "../../../../../lib/lx"
import { publicBooking, sameClient } from "../../../../../lib/services"

// Suivi : la référence ET le téléphone du client sont nécessaires.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const ref = String(req.query.ref || "").trim().toUpperCase(), phone = String(req.query.phone || "")
  const [b] = ref ? await lx(req.scope).listServiceBookings({ ref } as any) : []
  if (!b || !sameClient(b, phone)) return res.status(404).json({ message: "Aucune demande trouvée avec cette référence et ce téléphone." })
  res.json({ booking: publicBooking(b) })
}
