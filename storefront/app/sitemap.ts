import type { MetadataRoute } from "next"
import { listProducts } from "@/lib/medusa"
import { listServices } from "@/lib/services"
import { SITE } from "@/lib/site"
export const dynamic = "force-dynamic"
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [services, products] = await Promise.all([listServices(), listProducts({ limit: 100 }).catch(() => [])])
  return [
    ...["", "/store", "/services", "/outiko", "/register-shop"].map((p) => ({ url: SITE + p })),
    ...services.map((s) => ({ url: `${SITE}/services/${s.slug}` })),
    ...products.map((p) => ({ url: `${SITE}/products/${p.handle}` })),
  ]
}
