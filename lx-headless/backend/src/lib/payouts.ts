import { lx } from "./lx"
import { getCommission, percentFor } from "./commission"

export type Balance = { shop_id: string; code: string; name: string; rate: number; delivered: number; gross: number; commission: number; lx_collected: number; shop_collected: number; paid_to_shop: number; received_from_shop: number; balance: number }

/**
 * Solde entre Lx et chaque boutique (commandes livrées) :
 *  solde = encaissé par Lx pour la boutique − commission Lx − reversements déjà faits + sommes déjà reçues de la boutique.
 *  > 0 : Lx doit de l'argent à la boutique ; < 0 : la boutique doit sa commission à Lx.
 * Une commande est « encaissée par Lx » si un paiement en ligne confirmé existe pour elle ; sinon la boutique a encaissé elle-même (direct ou à la livraison).
 */
export async function balances(container: any, onlyShop?: string): Promise<Balance[]> {
  const svc = lx(container), cfg = await getCommission(container)
  const [shops, orders, pays, outs] = await Promise.all([
    svc.listShops(onlyShop ? ({ id: onlyShop } as any) : {}),
    svc.listShopOrders({ status: "delivered", ...(onlyShop ? { shop_id: onlyShop } : {}) } as any, { take: 20000 }),
    svc.listLxPayments({ target_type: "order", status: "paid" } as any, { take: 20000 }),
    svc.listPayouts(onlyShop ? ({ shop_id: onlyShop } as any) : {}, { take: 20000 }),
  ])
  const lxPaid = new Set(pays.map((p: any) => String(p.target_ref)))
  return shops.map((s: any) => {
    const mine = orders.filter((o: any) => o.shop_id === s.id), rate = percentFor(cfg, s.id)
    const gross = mine.reduce((t: number, o: any) => t + o.subtotal, 0)
    const commission = mine.reduce((t: number, o: any) => t + (o.commission ?? Math.round((o.subtotal * rate) / 100)), 0)
    const lx_collected = mine.filter((o: any) => lxPaid.has(String(o.order_display_id))).reduce((t: number, o: any) => t + o.subtotal, 0)
    const o2 = outs.filter((x: any) => x.shop_id === s.id), sum = (d: string) => o2.filter((x: any) => x.direction === d).reduce((t: number, x: any) => t + x.amount, 0)
    const paid_to_shop = sum("to_shop"), received_from_shop = sum("from_shop")
    return { shop_id: s.id, code: s.code, name: s.name, rate, delivered: mine.length, gross, commission, lx_collected, shop_collected: gross - lx_collected, paid_to_shop, received_from_shop, balance: lx_collected - commission - paid_to_shop + received_from_shop }
  })
}
export async function nextPayoutRef(container: any) {
  const all = await lx(container).listPayouts({}, { select: ["id", "ref"] })
  return `REV-${String(all.reduce((m: number, p: any) => Math.max(m, Number(/^REV-(\d+)$/.exec(p.ref)?.[1] || 0)), 0) + 1).padStart(4, "0")}`
}
