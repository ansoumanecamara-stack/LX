import type { MetadataRoute } from "next"
import { SITE } from "@/lib/site"
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/vendor", "/cart", "/checkout", "/account", "/order", "/track", "/services/suivi", "/medusa"] }], sitemap: `${SITE}/sitemap.xml` }
}
