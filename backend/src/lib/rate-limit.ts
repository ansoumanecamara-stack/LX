import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

// Limiteur en mémoire (suffisant pour une instance). Protège les formulaires publics contre le spam
// et la recherche par force brute d'une référence + téléphone.
const hits = new Map<string, { n: number; reset: number }>()
setInterval(() => { const t = Date.now(); for (const [k, v] of hits) if (v.reset < t) hits.delete(k) }, 60_000).unref?.()

export const rateLimit = (name: string, max: number, windowMs = 60_000) =>
  (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
    const ip = String((req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0] || req.socket?.remoteAddress || "?").trim()
    const key = `${name}:${ip}`, now = Date.now(), h = hits.get(key)
    if (!h || h.reset < now) { hits.set(key, { n: 1, reset: now + windowMs }); return next() }
    if (++h.n > max) { res.setHeader("Retry-After", String(Math.ceil((h.reset - now) / 1000))); return res.status(429).json({ message: "Trop de tentatives. Réessayez dans une minute." }) }
    next()
  }
