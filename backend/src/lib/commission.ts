import { lx } from "./lx"

export type CommissionCfg = { enabled: boolean; apply_pos: boolean; default_percent: number; per_shop: Record<string, number> }
const clamp = (v: any) => { const n = Number(v); return Number.isFinite(n) ? Math.min(50, Math.max(0, Math.round(n * 100) / 100)) : 0 }

export async function getCommission(container: any): Promise<CommissionCfg> {
  const [row] = await lx(container).listSettings({ key: "commission" } as any)
  const v: any = row?.value || {}
  return { enabled: v.enabled !== false, apply_pos: v.apply_pos === true, default_percent: clamp(v.default_percent), per_shop: Object.fromEntries(Object.entries(v.per_shop || {}).map(([k, x]) => [k, clamp(x)])) }
}
export async function saveCommission(container: any, b: any, shopIds: string[]): Promise<CommissionCfg> {
  // Avant de changer les taux, on fige les livraisons encore sans commission au taux actuel : l'historique ne bouge pas.
  const old = await getCommission(container), pending = await lx(container).listShopOrders({ status: "delivered" } as any, { take: 20000 })
  for (const r of pending.filter((x: any) => x.commission == null)) await lx(container).updateShopOrders({ id: r.id, commission: Math.round((r.subtotal * percentFor(old, r.shop_id)) / 100) } as any)
  const cfg: CommissionCfg = { enabled: b?.enabled !== false, apply_pos: b?.apply_pos === true, default_percent: clamp(b?.default_percent), per_shop: {} }
  for (const [k, x] of Object.entries(b?.per_shop || {})) if (shopIds.includes(k) && x !== "" && x !== null) cfg.per_shop[k] = clamp(x)
  const svc = lx(container), [row] = await svc.listSettings({ key: "commission" } as any)
  // Le champ JSON est fusionné à la mise à jour : on remplace la ligne pour que les taux retirés disparaissent vraiment.
  if (row) await svc.deleteSettings(row.id)
  await svc.createSettings({ key: "commission", value: cfg } as any)
  return cfg
}
/** Taux appliqué aux nouvelles ventes : 0 quand la commission est désactivée. */
export const percentFor = (cfg: CommissionCfg, shopId: string) => (cfg.enabled ? cfg.per_shop[shopId] ?? cfg.default_percent : 0)

/** Commission sur une vente en caisse (seulement si l'option « caisse » est activée). */
export async function posCommission(container: any, shopId: string, total: number) {
  const cfg = await getCommission(container)
  return cfg.enabled && cfg.apply_pos ? Math.round((total * percentFor(cfg, shopId)) / 100) : 0
}

/** Fige la commission des sous-commandes livrées (le taux appliqué est celui en vigueur au jour de la livraison). */
export async function freezeCommission(container: any, orderId: string) {
  const svc = lx(container), rows = await svc.listShopOrders({ order_id: orderId, status: "delivered" } as any)
  const todo = rows.filter((r: any) => r.commission == null); if (!todo.length) return
  const cfg = await getCommission(container)
  for (const r of todo) await svc.updateShopOrders({ id: r.id, commission: Math.round((r.subtotal * percentFor(cfg, r.shop_id)) / 100) } as any)
}
