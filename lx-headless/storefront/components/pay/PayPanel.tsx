"use client"
import { CheckCircle2, ExternalLink, Smartphone } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import Banner from "@/components/ui/Banner"
import Button from "@/components/ui/Button"
import { Field, Input } from "@/components/ui/Field"
import { cn } from "@/lib/cn"
import { fcfa, post, store } from "@/lib/medusa"

type Method = { id: string; label: string; mode: string; fee: number; fee_payer: string; charged: number; require_reference: boolean }
type Pay = { ref: string; method: string; label: string; mode: string; amount: number; fee: number; charged: number; status: string; reference: string | null; checkout_url: string | null; merchant_number: string | null; merchant_name: string | null; instructions: string | null; require_reference: boolean }
type Opts = { total: number; paid: number; due: number; methods: Method[]; pending: Pay | null; thanks: string }

/** Paiement en ligne d'une commande ou d'une demande de service : Wave / Orange Money selon les réglages de l'admin. */
export default function PayPanel({ type, refNo, phone, autoMethod, failed, onPaid }: { type: "order" | "service"; refNo: string; phone: string; autoMethod?: string; failed?: boolean; onPaid?: () => void }) {
  const [o, setO] = useState<Opts | null>(null), [err, setErr] = useState(""), [busy, setBusy] = useState(""), [sent, setSent] = useState(false), [done, setDone] = useState(false)
  const started = useRef(false), wasDue = useRef(false)
  const q = `type=${type}&ref=${encodeURIComponent(refNo)}&phone=${encodeURIComponent(phone)}`
  const load = useCallback(() => store(`/store/lx/payments/options?${q}`).then((d: Opts) => { setO(d); if (wasDue.current && d.due === 0 && !d.pending) { setDone(true); onPaid?.() } wasDue.current = d.due > 0 }).catch(() => {}), [q, onPaid])
  useEffect(() => { load() }, [load])
  useEffect(() => { if (!o?.pending || o.pending.status !== "pending") return; const t = setInterval(load, 6000); return () => clearInterval(t) }, [o?.pending, load])
  const choose = useCallback(async (method: string) => {
    setBusy(method); setErr("")
    try { const r = await post("/store/lx/payments", { type, ref: refNo, phone, method }); setO((x) => x && { ...x, pending: r.payment }); if (r.payment.mode === "api" && r.payment.checkout_url) window.location.href = r.payment.checkout_url }
    catch (e: any) { setErr(e.message) } finally { setBusy("") }
  }, [type, refNo, phone])
  useEffect(() => { if (autoMethod && o && !o.pending && o.due > 0 && o.methods.some((m) => m.id === autoMethod) && !started.current) { started.current = true; choose(autoMethod) } }, [autoMethod, o, choose])

  if (done) return <div className="flex items-start gap-3 rounded-2xl bg-brand-50 p-5" data-testid="pay-done"><CheckCircle2 className="size-6 shrink-0 text-brand-600" /><p className="font-semibold text-brand-700">{o?.thanks || "Merci, votre paiement est enregistré."}</p></div>
  if (!o || (o.due <= 0 && !o.pending)) return null
  const p = o.pending
  return (
    <section className="space-y-4 rounded-3xl border border-line bg-white p-6" data-testid="pay-panel" aria-label="Paiement en ligne">
      <div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="font-display text-xl font-bold">Payer en ligne</h3>
        <p className="text-sm text-slate-600">{o.paid > 0 && <>Déjà payé {fcfa(o.paid)} · </>}À payer <b className="text-ink" data-testid="pay-due">{fcfa(o.due)}</b></p></div>
      {failed && <Banner tone="danger">Le paiement n'a pas abouti. Vous pouvez réessayer.</Banner>}
      {err && <Banner tone="danger">{err}</Banner>}
      {!p && <div className="grid gap-3 sm:grid-cols-2" role="group" aria-label="Moyen de paiement">{o.methods.map((m) => (
        <button key={m.id} type="button" disabled={!!busy} onClick={() => choose(m.id)} data-testid={`pay-${m.id}`} className={cn("flex items-center gap-3 rounded-2xl border border-line p-4 text-left transition hover:border-brand-600 disabled:opacity-60", busy === m.id && "border-brand-600")}>
          <Smartphone className="size-6 text-brand-600" /><span><b className="block">{m.label}</b><span className="text-sm text-slate-600">{fcfa(m.charged)}{m.fee > 0 && m.fee_payer === "customer" ? ` dont ${fcfa(m.fee)} de frais` : ""}</span></span></button>))}</div>}
      {p && p.status === "pending" && <div className="space-y-4" data-testid="pay-pending">
        <p className="rounded-2xl bg-accent-500/15 p-4 text-[15px]">Montant à envoyer : <b className="font-display text-2xl" data-testid="pay-charged">{fcfa(p.charged)}</b>{p.fee > 0 && <span className="block text-sm text-slate-600">dont {fcfa(p.fee)} de frais {p.label}</span>}</p>
        {p.mode === "manual" && <p>Envoyez ce montant par {p.label} au <b className="font-display text-xl" data-testid="pay-number">{p.merchant_number}</b>{p.merchant_name ? ` (${p.merchant_name})` : ""}.</p>}
        {p.mode === "link" && p.checkout_url && <a href={p.checkout_url} target="_blank" rel="noreferrer" onClick={() => setSent(true)} className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-bold text-white hover:bg-brand-700" data-testid="pay-link">Payer avec {p.label}<ExternalLink className="size-4" /></a>}
        {p.mode === "api" && p.checkout_url && <a href={p.checkout_url} className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-bold text-white hover:bg-brand-700">Ouvrir {p.label}<ExternalLink className="size-4" /></a>}
        {p.instructions && <p className="text-sm text-slate-600">{p.instructions}</p>}
        {p.mode !== "api" && (p.reference
          ? <div data-testid="pay-verifying"><Banner tone="info">Référence {p.reference} reçue. Nous vérifions votre paiement, cela prend quelques minutes. Cette page se met à jour toute seule.</Banner></div>
          : (p.mode === "manual" || sent || p.require_reference) && <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); setBusy("ref"); setErr(""); try { const r = await post(`/store/lx/payments/${p.ref}/reference`, { phone, reference: new FormData(e.currentTarget).get("reference") }); setO((x) => x && { ...x, pending: r.payment }) } catch (er: any) { setErr(er.message) } finally { setBusy("") } }}>
            <Field label="Référence de la transaction (reçue par SMS)">{(id) => <Input id={id} name="reference" placeholder="ex : MP241115.1234.A56789" required minLength={4} data-testid="pay-reference" />}</Field>
            <Button loading={busy === "ref"} data-testid="pay-send-ref">J&apos;ai payé</Button></form>)}
        {p.mode === "api" && <p className="text-sm text-slate-600">Une fois le paiement fait sur {p.label}, cette page se met à jour automatiquement.</p>}
        <button type="button" onClick={() => setO((x) => x && { ...x, pending: null })} className="text-sm font-semibold text-slate-500 underline underline-offset-4 hover:text-brand-600" hidden={!!p.reference}>Choisir un autre moyen</button></div>}
    </section>)
}
