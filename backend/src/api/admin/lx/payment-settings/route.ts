import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { DEFAULTS, getConfig, sanitize, saveConfig, waveEnv } from "../../../../lib/payments"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  res.json({ config: await getConfig(req.scope), defaults: DEFAULTS, env: waveEnv(), webhook_path: "/hooks/lx/wave", storefront_url: process.env.LX_STOREFRONT_URL || null })
}
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const cfg = sanitize(req.body as any, await getConfig(req.scope))
  for (const [id, m] of Object.entries(cfg.methods)) {
    if (m.enabled && m.mode === "manual" && !m.merchant_number) return res.status(400).json({ message: `${m.label} : indiquez le numéro marchand (mode manuel).` })
    if (m.enabled && m.mode === "link" && !m.link_template) return res.status(400).json({ message: `${m.label} : indiquez le lien de paiement (https://…).` })
    if (m.enabled && m.mode === "api" && id === "wave" && !waveEnv().api_key) return res.status(400).json({ message: "Wave API : ajoutez d'abord LX_WAVE_API_KEY dans les variables d'environnement du serveur." })
  }
  await saveConfig(req.scope, cfg)
  res.json({ config: cfg })
}
