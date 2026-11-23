import { waSend } from "./lx"

/** Prévient le client par WhatsApp quand sa sous-commande change d'état (si l'API WhatsApp est configurée). */
export async function notifyCustomerOrder(so: any, status: string) {
  const site = (process.env.LX_STOREFRONT_URL || "").replace(/\/$/, ""), link = site ? `\n${site}/order/${so.order_display_id}?phone=${so.customer_phone}` : ""
  const n = `#${so.order_display_id}`
  const t: Record<string, string> = {
    confirmed: `Lx : la boutique a confirmé votre commande ${n}. On prépare votre colis.`,
    picked_up: `Lx : votre commande ${n} est en route. Code de livraison à donner au livreur : ${so.delivery_code}.`,
    delivered: `Lx : votre commande ${n} est livrée. Merci de votre confiance !`,
    rejected: `Lx : désolé, la boutique ne peut pas honorer votre commande ${n}. Vous n'êtes pas débité ; contactez-nous pour une alternative.`,
  }
  if (t[status]) await waSend(so.customer_phone, t[status] + link).catch(() => {})
}
