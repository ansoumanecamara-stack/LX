import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { lx, norm } from "./lx"
import { PayCfg, availableMethods, paidTotal, publicPayment } from "./payments"
import { publicBooking, sameClient } from "./services"

export type Target = { type: "order" | "service"; ref: string; phone: string; total: number; paid: number; due: number; kind: "full" | "deposit" | "balance"; return_path: string; required_before_start: number }

/** Montant restant dû pour une prestation, selon le calendrier choisi dans les réglages (après / acompte / avant). */
export function serviceDue(b: any, cfg: PayCfg, paid: number) {
  const quote = b.quote_amount || 0, pct = cfg.services.deposit_percent
  const required = cfg.services.timing === "before" ? quote : cfg.services.timing === "deposit" ? Math.ceil((quote * pct) / 100) : 0
  let due = 0
  if (["confirmed", "in_progress"].includes(b.status)) due = Math.max(0, required - paid)
  else if (b.status === "done") due = Math.max(0, quote - paid)
  return { quote, required, due }
}

export async function resolveTarget(container: any, cfg: PayCfg, type: string, ref: string, phone?: string): Promise<Target | null> {
  const svc = lx(container)
  if (type === "service") {
    const [b] = await svc.listServiceBookings({ ref: String(ref).toUpperCase() } as any)
    if (!b || (phone !== undefined && !sameClient(b, phone))) return null
    const paid = await paidTotal(container, "service", b.ref), { quote, required, due } = serviceDue(b, cfg, paid)
    return { type: "service", ref: b.ref, phone: norm(b.customer_phone), total: quote, paid, due, kind: paid > 0 ? "balance" : (b.status === "done" || cfg.services.timing === "before" ? "full" : "deposit"), return_path: `/services/suivi?ref=${b.ref}&phone=${norm(b.customer_phone)}`, required_before_start: required }
  }
  if (type === "order") {
    const display = Number(String(ref).replace(/\D/g, ""))
    const rows = (await svc.listShopOrders({ order_display_id: display } as any)).filter((r: any) => !["cancelled", "rejected"].includes(r.status))
    if (!rows.length || (phone !== undefined && norm(rows[0].customer_phone).slice(-9) !== norm(phone).slice(-9))) return null
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: [o] } = await query.graph({ entity: "order", fields: ["id", "discount_total"], filters: { id: rows[0].order_id } })
    const total = Math.max(0, rows.reduce((s: number, r: any) => s + r.subtotal, 0) - Number((o as any)?.discount_total || 0))
    const paid = await paidTotal(container, "order", String(display))
    return { type: "order", ref: String(display), phone: norm(rows[0].customer_phone), total, paid, due: Math.max(0, total - paid), kind: paid > 0 ? "balance" : "full", return_path: `/order/${display}?phone=${norm(rows[0].customer_phone)}`, required_before_start: 0 }
  }
  return null
}

/** Vue publique d'une demande de service, avec l'état du paiement. */
export async function bookingView(container: any, cfg: PayCfg, b: any) {
  const t = await resolveTarget(container, cfg, "service", b.ref)
  const pays = await lx(container).listLxPayments({ target_type: "service", target_ref: b.ref } as any, { order: { created_at: "DESC" }, take: 20 })
  const pending = pays.find((p: any) => p.status === "pending") ?? null
  return {
    ...publicBooking(b),
    payment: t && {
      total: t.total, paid: t.paid, due: t.due, kind: t.kind, required_before_start: t.required_before_start, timing: cfg.services.timing,
      methods: availableMethods(cfg, "service", t.due), pending: pending && publicPayment(pending, cfg),
      history: pays.filter((p: any) => p.status === "paid").map((p: any) => ({ ref: p.ref, label: (cfg.methods as any)[p.method]?.label ?? "Espèces", amount: p.amount, paid_at: p.paid_at })),
    },
  }
}
