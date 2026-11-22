import { defineMiddlewares, authenticate } from "@medusajs/framework/http"
import cors from "cors"
import { rateLimit } from "../lib/rate-limit"

const origins = (process.env.STORE_CORS || "http://localhost:3000").split(",").map((s) => s.trim())

export default defineMiddlewares({
  routes: [
    // Envoi d'images en base64 (photos produit, visuels publicitaires) : limite relevée
    { matcher: "/vendor/products*", methods: ["POST"], bodyParser: { sizeLimit: "6mb" } },
    { matcher: "/admin/lx/ad-images", methods: ["POST"], bodyParser: { sizeLimit: "6mb" } },
    // Anti-spam et anti force brute sur les formulaires et suivis publics
    { matcher: "/store/lx/service-bookings", methods: ["POST"], middlewares: [rateLimit("booking", 8)] },
    { matcher: "/store/lx/service-requests", methods: ["POST"], middlewares: [rateLimit("request", 8)] },
    { matcher: "/store/lx/shops/register", methods: ["POST"], middlewares: [rateLimit("register", 5, 10 * 60_000)] },
    { matcher: "/store/lx/reviews", methods: ["POST"], middlewares: [rateLimit("review", 10)] },
    { matcher: "/store/lx/service-bookings/track", methods: ["GET"], middlewares: [rateLimit("track-svc", 20)] },
    { matcher: "/store/lx/service-bookings/*/action", methods: ["POST"], middlewares: [rateLimit("svc-action", 20)] },
    { matcher: "/store/lx/service-bookings/*/review", methods: ["POST"], middlewares: [rateLimit("svc-review", 10)] },
    { matcher: "/store/lx/track", methods: ["GET"], middlewares: [rateLimit("track", 20)] },
    // Espace boutique : acteur personnalisé « shop » (auth emailpass), appelé depuis la vitrine Next.js
    { matcher: "/vendor*", middlewares: [cors({ origin: origins, credentials: true }), authenticate("shop", ["session", "bearer"])] },
  ],
})
