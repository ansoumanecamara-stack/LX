import { model } from "@medusajs/framework/utils"

// Reversement entre Lx et une boutique : to_shop = Lx paie la boutique, from_shop = la boutique paie Lx (commission).
const Payout = model.define("lx_payout", {
  id: model.id({ prefix: "pyt" }).primaryKey(),
  ref: model.text().unique(), // REV-0001
  shop_id: model.text().index(),
  direction: model.enum(["to_shop", "from_shop"]).default("to_shop"),
  amount: model.number(),
  method: model.text(), // wave | orange_money | cash | bank
  reference: model.text().nullable(),
  note: model.text().nullable(),
})
export default Payout
