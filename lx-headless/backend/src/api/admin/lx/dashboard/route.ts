import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { lx } from "../../../../lib/lx"

const day = (d: any) => new Date(d).toISOString().slice(0, 10)
const add = (o: Record<string, number>, k: string, v: number) => { o[k] = (o[k] || 0) + v }

// Chiffres clés sur 7, 30 ou 90 jours : ventes boutiques livrées, caisse, services terminés, demandes et commandes.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const days = [7, 30, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 30
  const svc = lx(req.scope), since = new Date(Date.now() - days * 864e5), sinceDay = day(since)
  const [orders, pos, bookings, shops, requests] = await Promise.all([
    svc.listShopOrders({}, { take: 5000, order: { created_at: "DESC" } }),
    svc.listPosSales({}, { take: 5000, order: { created_at: "DESC" } }),
    svc.listServiceBookings({}, { take: 5000, order: { created_at: "DESC" } }),
    svc.listShops({}),
    svc.listServiceRequests({}, { take: 2000 }).catch(() => []),
  ])
  const inP = (r: any) => new Date(r.created_at) >= since
  const o = orders.filter(inP), p = pos.filter(inP).filter((s: any) => s.status === "completed"), b = bookings.filter(inP), rq = (requests as any[]).filter(inP)

  const series: Record<string, { orders: number; pos: number; services: number }> = {}
  for (let i = days - 1; i >= 0; i--) series[day(Date.now() - i * 864e5)] = { orders: 0, pos: 0, services: 0 }
  const bump = (k: string, f: "orders" | "pos" | "services", v: number) => { if (series[k]) series[k][f] += v }
  const ordersRevenue = o.filter((x: any) => x.status === "delivered"); ordersRevenue.forEach((x: any) => bump(day(x.created_at), "orders", x.subtotal))
  p.forEach((x: any) => bump(day(x.created_at), "pos", x.total))
  const done = b.filter((x: any) => x.status === "done"); done.forEach((x: any) => bump(day(x.updated_at || x.created_at), "services", x.quote_amount || 0))

  const count = (rows: any[]) => rows.reduce((m: Record<string, number>, r: any) => (add(m, r.status, 1), m), {})
  const byService: Record<string, { name: string; count: number; revenue: number; rated: number; sum: number }> = {}
  for (const x of b) { const s = (byService[x.service_slug] ||= { name: x.service_name, count: 0, revenue: 0, rated: 0, sum: 0 }); s.count++; if (x.status === "done") { s.revenue += x.quote_amount || 0; if (x.rating != null) { s.rated++; s.sum += Number(x.rating) } } }
  const shopName = new Map(shops.map((s: any) => [s.id, s.code]))
  const byShop: Record<string, number> = {}
  ordersRevenue.forEach((x: any) => add(byShop, shopName.get(x.shop_id) || "?", x.subtotal)); p.forEach((x: any) => add(byShop, shopName.get(x.shop_id) || "?", x.total))
  const rated = bookings.filter((x: any) => x.rating != null)

  res.json({
    days, since: sinceDay,
    revenue: { orders: ordersRevenue.reduce((s: number, x: any) => s + x.subtotal, 0), pos: p.reduce((s: number, x: any) => s + x.total, 0), services: done.reduce((s: number, x: any) => s + (x.quote_amount || 0), 0) },
    commission: ordersRevenue.reduce((t: number, x: any) => t + (x.commission || 0), 0),
    counts: { orders: o.length, orders_delivered: ordersRevenue.length, pos_sales: p.length, bookings: b.length, bookings_done: done.length, outiko_requests: rq.length, new_shops: shops.filter(inP).length },
    orders_by_status: count(o), bookings_by_status: count(b),
    attention: {
      bookings_new: bookings.filter((x: any) => x.status === "new").length,
      bookings_quoted_waiting: bookings.filter((x: any) => x.status === "quoted").length,
      bookings_without_worker: bookings.filter((x: any) => ["quoted", "confirmed"].includes(x.status) && !x.worker_id).length,
      orders_escalated: orders.filter((x: any) => x.escalated && ["pending", "confirmed"].includes(x.status)).length,
      shops_pending: shops.filter((s: any) => s.status === "pending").length,
    },
    series: Object.entries(series).map(([date, v]) => ({ date, ...v })),
    top_services: Object.values(byService).sort((a, c) => c.count - a.count).slice(0, 6).map((s) => ({ name: s.name, count: s.count, revenue: s.revenue, rating: s.rated ? Math.round((s.sum / s.rated) * 10) / 10 : null })),
    top_shops: Object.entries(byShop).sort((a, c) => c[1] - a[1]).slice(0, 5).map(([code, total]) => ({ code, total })),
    satisfaction: { avg: rated.length ? Math.round((rated.reduce((s: number, x: any) => s + Number(x.rating), 0) / rated.length) * 10) / 10 : null, count: rated.length },
  })
}
