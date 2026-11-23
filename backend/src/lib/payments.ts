import crypto from "node:crypto"
import { lx, norm, waSend } from "./lx"

export type Mode = "manual" | "link" | "api"
export type MethodCfg = {
  enabled: boolean; label: string; mode: Mode
  merchant_number: string; merchant_name: string; link_template: string; instructions: string
  fee_percent: number; fee_fixed: number; fee_payer: "customer" | "lx"
  min_amount: number; max_amount: number // 0 = sans limite
  apply_products: boolean; apply_services: boolean
  require_reference: boolean; expire_hours: number
}
export type PayCfg = {
  methods: { wave: MethodCfg; orange_money: MethodCfg }
  products: { online_mode: "direct" | "lx" } // direct : le client paie le numéro de chaque boutique ; lx : Lx encaisse
  services: { timing: "after" | "deposit" | "before"; deposit_percent: number; block_start_until_paid: boolean }
  thanks_message: string
}
const method = (label: string, over: Partial<MethodCfg> = {}): MethodCfg => ({
  enabled: false, label, mode: "manual", merchant_number: "", merchant_name: "Lx", link_template: "", instructions: "",
  fee_percent: 0, fee_fixed: 0, fee_payer: "customer", min_amount: 0, max_amount: 0, apply_products: true, apply_services: true,
  require_reference: true, expire_hours: 24, ...over,
})
export const DEFAULTS: PayCfg = {
  methods: { wave: method("Wave"), orange_money: method("Orange Money") },
  products: { online_mode: "direct" },
  services: { timing: "after", deposit_percent: 30, block_start_until_paid: true },
  thanks_message: "Merci, votre paiement est enregistré.",
}
export const METHOD_IDS = ["wave", "orange_money"] as const
const num = (v: any, min: number, max: number, d: number) => { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d }
const str = (v: any, max: number) => String(v ?? "").trim().slice(0, max)
const url = (v: any) => { const s = str(v, 500); return /^https?:\/\/\S+$/.test(s) ? s : "" }

/** Valide et normalise un jeu de réglages venant de l'admin (aucune confiance dans le corps de la requête). */
export function sanitize(b: any, base: PayCfg = DEFAULTS): PayCfg {
  const out: PayCfg = JSON.parse(JSON.stringify(base))
  for (const id of METHOD_IDS) {
    const i = b?.methods?.[id]; if (!i) continue
    const m = out.methods[id]
    m.enabled = !!i.enabled; m.label = str(i.label, 40) || base.methods[id].label
    m.mode = id === "orange_money" ? (i.mode === "link" ? "link" : "manual") : (["manual", "link", "api"].includes(i.mode) ? i.mode : "manual")
    m.merchant_number = norm(str(i.merchant_number, 20)); m.merchant_name = str(i.merchant_name, 60)
    m.link_template = url(i.link_template); m.instructions = str(i.instructions, 600)
    m.fee_percent = num(i.fee_percent, 0, 20, 0); m.fee_fixed = Math.round(num(i.fee_fixed, 0, 100000, 0)); m.fee_payer = i.fee_payer === "lx" ? "lx" : "customer"
    m.min_amount = Math.round(num(i.min_amount, 0, 1e8, 0)); m.max_amount = Math.round(num(i.max_amount, 0, 1e9, 0))
    m.apply_products = !!i.apply_products; m.apply_services = !!i.apply_services
    m.require_reference = !!i.require_reference; m.expire_hours = Math.round(num(i.expire_hours, 1, 720, 24))
  }
  if (b?.products) out.products.online_mode = b.products.online_mode === "lx" ? "lx" : "direct"
  if (b?.services) {
    out.services.timing = ["after", "deposit", "before"].includes(b.services.timing) ? b.services.timing : "after"
    out.services.deposit_percent = Math.round(num(b.services.deposit_percent, 1, 100, 30))
    out.services.block_start_until_paid = !!b.services.block_start_until_paid
  }
  if (b?.thanks_message !== undefined) out.thanks_message = str(b.thanks_message, 300)
  return out
}

export async function getConfig(container: any): Promise<PayCfg> {
  const [row] = await lx(container).listSettings({ key: "payments" } as any)
  return row ? sanitize(row.value as any) : DEFAULTS
}
export async function saveConfig(container: any, cfg: PayCfg) {
  const svc = lx(container), [row] = await svc.listSettings({ key: "payments" } as any)
  if (row) await svc.deleteSettings(row.id)
  await svc.createSettings({ key: "payments", value: cfg } as any)
}

/** Ce qui manque pour que « Wave API » fonctionne : la clé reste dans l'environnement, jamais en base. */
export const waveEnv = () => ({ api_key: !!process.env.LX_WAVE_API_KEY, webhook_secret: !!(process.env.LX_WAVE_WEBHOOK_SECRET || process.env.LX_WAVE_SIGNING_SECRET) })

export const feeOf = (m: MethodCfg, amount: number) => Math.round((amount * m.fee_percent) / 100) + m.fee_fixed
export const chargedOf = (m: MethodCfg, amount: number) => amount + (m.fee_payer === "customer" ? feeOf(m, amount) : 0)
const configured = (id: string, m: MethodCfg) => m.mode === "api" ? id === "wave" && waveEnv().api_key : m.mode === "link" ? !!m.link_template : !!m.merchant_number

/** Moyens proposables au client pour ce montant : actifs, configurés, dans les bornes, adaptés au type de commande. */
export function availableMethods(cfg: PayCfg, target: "order" | "service", amount: number) {
  if (target === "order" && cfg.products.online_mode !== "lx") return []
  return METHOD_IDS.flatMap((id) => {
    const m = cfg.methods[id]
    if (!m.enabled || !configured(id, m) || amount <= 0) return []
    if (target === "order" ? !m.apply_products : !m.apply_services) return []
    if (amount < m.min_amount || (m.max_amount > 0 && amount > m.max_amount)) return []
    const fee = feeOf(m, amount)
    return [{ id, label: m.label, mode: m.mode, fee, fee_payer: m.fee_payer, charged: chargedOf(m, amount), require_reference: m.require_reference }]
  })
}

export const fill = (tpl: string, v: Record<string, string | number>) => tpl.replace(/\{(\w+)\}/g, (_, k) => encodeURIComponent(String(v[k] ?? "")))

/** Ce que le client voit d'un paiement : jamais de note interne. */
export const publicPayment = (p: any, cfg: PayCfg) => {
  const m = (cfg.methods as any)[p.method] as MethodCfg | undefined
  return {
    ref: p.ref, method: p.method, label: m?.label ?? "Espèces", mode: p.mode, kind: p.kind, amount: p.amount, fee: p.fee, charged: p.charged, status: p.status,
    reference: p.reference, checkout_url: p.checkout_url, expires_at: p.expires_at, paid_at: p.paid_at,
    merchant_number: p.mode === "manual" ? m?.merchant_number ?? null : null, merchant_name: m?.merchant_name ?? null,
    instructions: m?.instructions || null, require_reference: !!m?.require_reference,
  }
}

export async function nextPayRef(container: any) {
  const all = await lx(container).listLxPayments({}, { select: ["id", "ref"] })
  const max = all.reduce((m: number, p: any) => Math.max(m, Number(/^PAY-(\d+)$/.exec(p.ref)?.[1] || 0)), 0)
  return `PAY-${String(max + 1).padStart(5, "0")}`
}

/** Passe les paiements en attente dont le délai est dépassé à « expiré ». */
export async function expireOld(container: any) {
  const svc = lx(container), now = new Date()
  const old = await svc.listLxPayments({ status: "pending" } as any)
  for (const p of old) if (p.expires_at && new Date(p.expires_at) < now && !p.reference) await svc.updateLxPayments({ id: p.id, status: "expired" } as any)
}

// ---------- Wave Checkout API ----------
const WAVE = () => process.env.LX_WAVE_API_BASE || "https://api.wave.com"
export async function waveCreateSession(p: { amount: number; ref: string; success_url: string; error_url: string; phone?: string }) {
  const key = process.env.LX_WAVE_API_KEY
  if (!key) throw new Error("Clé API Wave absente (LX_WAVE_API_KEY).")
  const body: any = { amount: String(Math.round(p.amount)), currency: "XOF", client_reference: p.ref, success_url: p.success_url, error_url: p.error_url }
  if (p.phone && /^\d{9,15}$/.test(p.phone)) body.restrict_payer_mobile = `+${p.phone.length === 9 ? "221" + p.phone : p.phone}`
  const r = await fetch(`${WAVE()}/v1/checkout/sessions`, { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) })
  const j: any = await r.json().catch(() => ({}))
  if (!r.ok || !j.wave_launch_url) throw new Error(`Wave a refusé la demande (${r.status}) ${j.message || j.code || ""}`.trim())
  return { id: String(j.id), url: String(j.wave_launch_url) }
}

/** Authentifie un webhook Wave : secret partagé (Bearer) ou signature HMAC-SHA256 « Wave-Signature: t=…,v1=… » sur timestamp + corps brut. */
export function verifyWaveWebhook(headers: Record<string, any>, raw: string): boolean {
  const bearer = process.env.LX_WAVE_WEBHOOK_SECRET, signing = process.env.LX_WAVE_SIGNING_SECRET
  const eq = (a: string, b: string) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
  const auth = String(headers["authorization"] || "")
  if (bearer && auth.startsWith("Bearer ") && eq(auth.slice(7), bearer)) return true
  const sig = String(headers["wave-signature"] || "")
  if (signing && sig) {
    const parts = Object.fromEntries(sig.split(",").map((s) => s.split("=") as [string, string])), t = parts["t"]
    if (!t || Math.abs(Date.now() / 1000 - Number(t)) > 300) return false
    const good = crypto.createHmac("sha256", signing).update(t + raw).digest("hex")
    return sig.split(",").filter((s) => s.startsWith("v1=")).some((s) => eq(s.slice(3), good))
  }
  return false
}

// ---------- Effets d'un paiement ----------
export const paidTotal = async (container: any, type: string, ref: string) =>
  (await lx(container).listLxPayments({ target_type: type, target_ref: String(ref), status: "paid" } as any)).reduce((s: number, p: any) => s + p.amount, 0)

/** Marque un paiement comme reçu (idempotent) et applique ses effets sur la commande ou la prestation. */
export async function markPaid(container: any, id: string, by = "système") {
  const svc = lx(container), p = await svc.retrieveLxPayment(id)
  if (p.status === "paid") return p
  const u = await svc.updateLxPayments({ id, status: "paid", paid_at: new Date(), note: [p.note, `Confirmé par ${by}`].filter(Boolean).join(" | ") } as any)
  if (p.target_type === "order") {
    const rows = await svc.listShopOrders({ order_display_id: Number(p.target_ref) } as any)
    const total = rows.filter((r: any) => !["cancelled", "rejected"].includes(r.status)).reduce((s: number, r: any) => s + r.subtotal, 0)
    if ((await paidTotal(container, "order", p.target_ref)) >= total - 1) for (const r of rows) await svc.updateShopOrders({ id: r.id, payment_status: "paid", payment_method: p.method, payment_ref: p.reference || p.ref } as any)
  }
  if (process.env.LX_WA_NUMBER) waSend(process.env.LX_WA_NUMBER, `💰 Paiement ${p.ref} reçu : ${p.charged} FCFA (${p.method}) pour ${p.target_type === "order" ? `commande #${p.target_ref}` : p.target_ref}.`).catch(() => {})
  return u
}
