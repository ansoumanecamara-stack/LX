import { model } from "@medusajs/framework/utils"

// Journal des paiements en ligne (Wave, Orange Money) et encaissements saisis par l'équipe.
const Payment = model.define("lx_payment", {
  id: model.id({ prefix: "pay" }).primaryKey(),
  ref: model.text().unique(), // PAY-00001
  target_type: model.enum(["order", "service"]),
  target_ref: model.text().index(), // n° de commande Medusa (display_id) ou référence SRV-xxxxx
  customer_phone: model.text(),
  method: model.enum(["wave", "orange_money", "cash"]),
  mode: model.enum(["manual", "link", "api", "cash"]).default("manual"),
  kind: model.enum(["full", "deposit", "balance"]).default("full"),
  amount: model.number(), // montant dû pour la commande ou la prestation (FCFA)
  fee: model.number().default(0), // frais du moyen de paiement
  charged: model.number(), // montant réellement demandé au client (amount + frais s'ils sont à sa charge)
  status: model.enum(["pending", "paid", "failed", "expired", "refunded"]).default("pending"),
  reference: model.text().nullable(), // référence de transaction saisie par le client
  provider_id: model.text().nullable(), // identifiant de session côté Wave (cos-…)
  checkout_url: model.text().nullable(),
  note: model.text().nullable(), // interne
  paid_at: model.dateTime().nullable(),
  expires_at: model.dateTime().nullable(),
})
export default Payment
