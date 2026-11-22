import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { lx, norm, validPhone, waLink, waSend } from "../../../../lib/lx"
import { nextRef, publicBooking, SLOTS, today } from "../../../../lib/services"

// Réservation d'un service à domicile par le client.
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const b = (req.body || {}) as any, svc = lx(req.scope)
  const [service] = await svc.listPrestations({ slug: String(b.service_slug || ""), active: true } as any)
  if (!service) return res.status(400).json({ message: "Service inconnu." })
  const name = String(b.name || "").trim(), address = String(b.address || "").trim(), details = String(b.details || "").trim(), date = String(b.date || "")
  if (!name) return res.status(400).json({ message: "Nom requis." })
  if (!validPhone(b.phone || "")) return res.status(400).json({ message: "Téléphone invalide." })
  if (!address) return res.status(400).json({ message: "Adresse de l'intervention requise." })
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < today()) return res.status(400).json({ message: "Choisissez une date à partir d'aujourd'hui." })
  if (!details) return res.status(400).json({ message: "Décrivez le problème ou le travail à faire." })
  const slot = SLOTS[b.slot] ? b.slot : "any"
  const ref = await nextRef(req.scope)
  const booking = await svc.createServiceBookings({
    ref, prestation_id: service.id, service_slug: service.slug, service_name: service.name, customer_name: name.slice(0, 120), customer_phone: norm(b.phone),
    address: address.slice(0, 255), area: b.area ? String(b.area).trim().slice(0, 120) : null, preferred_date: date, time_slot: slot, details: details.slice(0, 2000),
  } as any)
  const lxNumber = process.env.LX_WA_NUMBER
  if (lxNumber) waSend(lxNumber, `🛠 Nouvelle demande ${ref} : ${service.name}\n${name}, +${norm(b.phone)}\n${address}\n${date}, ${SLOTS[slot]}\n${details.slice(0, 300)}`).catch(() => {})
  waSend(b.phone, `Lx : votre demande ${ref} pour « ${service.name} » est bien reçue. Un conseiller vous contacte avec un devis. Suivi : ${process.env.LX_STOREFRONT_URL || ""}/services/suivi?ref=${ref}`).catch(() => {})
  res.status(201).json({ booking: publicBooking(booking), whatsapp: lxNumber ? waLink(lxNumber, `Bonjour Lx, ma demande ${ref} (${service.name})`) : null })
}
