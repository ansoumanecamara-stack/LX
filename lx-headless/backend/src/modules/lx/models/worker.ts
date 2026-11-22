import { model } from "@medusajs/framework/utils"

// Ouvrier agréé Lx. Le client ne voit que l'identifiant (OUV-0001), jamais le nom ni le téléphone.
const Worker = model.define("worker", {
  id: model.id({ prefix: "wrk" }).primaryKey(),
  code: model.text().unique(),
  name: model.text(),
  phone: model.text(),
  trades: model.text().default(""), // slugs des services assurés, séparés par des virgules
  zone: model.text().nullable(),
  active: model.boolean().default(true),
  notes: model.text().nullable(),
})
export default Worker
