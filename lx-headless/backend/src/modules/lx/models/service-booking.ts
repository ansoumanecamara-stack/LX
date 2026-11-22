import { model } from "@medusajs/framework/utils"

// Demande d'intervention d'un client pour un service à domicile.
const ServiceBooking = model.define("service_booking", {
  id: model.id({ prefix: "bkg" }).primaryKey(),
  ref: model.text().unique(), // SRV-10001, donné au client pour le suivi
  prestation_id: model.text(),
  service_slug: model.text(),
  service_name: model.text(),
  customer_name: model.text(),
  customer_phone: model.text(),
  address: model.text(),
  area: model.text().nullable(),
  preferred_date: model.text(), // AAAA-MM-JJ
  time_slot: model.enum(["morning", "afternoon", "evening", "any"]).default("any"),
  details: model.text(),
  status: model.enum(["new", "quoted", "confirmed", "in_progress", "done", "cancelled"]).default("new"),
  quote_amount: model.number().nullable(), // FCFA, fixé par le conseiller Lx
  worker_id: model.text().nullable(),
  worker_code: model.text().nullable(),
  admin_note: model.text().nullable(), // interne, jamais exposé au client
  rating: model.number().nullable(), // avis client 1 à 5, uniquement après « Terminée »
  review_text: model.text().nullable(),
  reviewed_at: model.dateTime().nullable(),
})
export default ServiceBooking
