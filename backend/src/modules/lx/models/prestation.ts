import { model } from "@medusajs/framework/utils"

// Catalogue des services à domicile (plomberie, électricité, informatique…), géré depuis l'admin.
const Prestation = model.define("prestation", {
  id: model.id({ prefix: "svc" }).primaryKey(),
  slug: model.text().unique(),
  name: model.text(),
  group: model.text().default("Maison"), // famille affichée sur le site : Maison, Informatique, Entretien…
  summary: model.text(), // une phrase pour les cartes
  description: model.text().nullable(), // détail sur la page du service
  image_url: model.text().nullable(),
  icon: model.text().default("wrench"), // icône quand il n'y a pas de photo
  price_from: model.number().nullable(), // prix « à partir de », FCFA
  price_note: model.text().nullable(), // ex : « Devis gratuit après échange »
  active: model.boolean().default(true),
  sort: model.number().default(0),
})
export default Prestation
