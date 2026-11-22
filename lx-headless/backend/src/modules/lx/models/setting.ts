import { model } from "@medusajs/framework/utils"

// Réglages modifiables depuis l'admin (ex. key = "payments"). Les secrets restent dans les variables d'environnement.
const Setting = model.define("lx_setting", {
  id: model.id({ prefix: "set" }).primaryKey(),
  key: model.text().unique(),
  value: model.json(),
})
export default Setting
