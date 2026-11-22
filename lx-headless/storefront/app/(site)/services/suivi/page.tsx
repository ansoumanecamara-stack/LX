"use client"
import { CalendarDays, MapPin, UserCheck } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense, useCallback, useEffect, useState } from "react"
import Badge from "@/components/ui/Badge"
import Banner from "@/components/ui/Banner"
import Button from "@/components/ui/Button"
import Container from "@/components/ui/Container"
import { Field, Input } from "@/components/ui/Field"
import PageHeader from "@/components/ui/PageHeader"
import Stepper from "@/components/ui/Stepper"
import PayPanel from "@/components/pay/PayPanel"
import ReviewForm from "@/components/services/ReviewForm"
import Stars from "@/components/services/Stars"
import { fcfa, store } from "@/lib/medusa"
import { dayLabel, type Booking } from "@/lib/services"

const STEPS = ["Demande reçue", "Devis", "Confirmée", "En cours", "Terminée"]
const IDX: Record<string, number> = { new: 0, quoted: 1, confirmed: 2, in_progress: 3, done: 4 }

function Inner() {
  const sp = useSearchParams(), [ref, setRef] = useState(sp.get("ref") ?? ""), [phone, setPhone] = useState(sp.get("phone") ?? "")
  const [paidNow, setPaidNow] = useState(false), [b, setB] = useState<Booking | null>(null), [err, setErr] = useState(""), [busy, setBusy] = useState(false)
  const load = useCallback(async (r: string, p: string) => {
    setBusy(true); setErr("")
    try { setB((await store(`/store/lx/service-bookings/track?ref=${encodeURIComponent(r.trim())}&phone=${encodeURIComponent(p)}`)).booking) } catch (e: any) { setB(null); setErr(e.message) } finally { setBusy(false) }
  }, [])
  useEffect(() => { if (sp.get("ref") && sp.get("phone")) load(sp.get("ref")!, sp.get("phone")!) }, [sp, load])
  const act = async (action: "accept" | "cancel") => {
    if (action === "cancel" && !confirm("Annuler cette demande ?")) return
    setBusy(true); setErr("")
    try { const r = await store(`/store/lx/service-bookings/${b!.ref}/action`, { method: "POST", body: JSON.stringify({ phone, action }) }); setB(r.booking) } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }
  return (<>
    <PageHeader title="Suivre ma demande de service" />
    <Container className="max-w-2xl space-y-6 py-8">
      <form className="grid gap-4 rounded-3xl border border-line bg-white p-6 sm:grid-cols-[1fr_1fr_auto] sm:items-end" onSubmit={(e) => { e.preventDefault(); load(ref, phone) }}>
        <Field label="Référence">{(id) => <Input id={id} value={ref} onChange={(e) => setRef(e.target.value)} placeholder="SRV-10001" required data-testid="track-ref" />}</Field>
        <Field label="Téléphone">{(id) => <Input id={id} type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="77 123 45 67" required data-testid="track-phone" />}</Field>
        <Button loading={busy} data-testid="track-go">Voir</Button></form>
      {err && <Banner tone="danger">{err}</Banner>}
      {b && (
        <article className="space-y-6 rounded-3xl border border-line bg-white p-6 sm:p-7" data-testid="booking-status">
          <header className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm text-slate-500">{b.ref}</p><h2 className="text-2xl font-extrabold">{b.service_name}</h2></div>
            <Badge tone={b.status === "cancelled" ? "red" : b.status === "done" ? "green" : "orange"}>{b.status_label}</Badge></header>
          {b.status !== "cancelled" && <Stepper steps={STEPS} current={IDX[b.status]} finished={b.status === "done"} />}
          <ul className="space-y-2.5 text-[15px] text-slate-700">
            <li className="flex gap-2.5"><CalendarDays className="mt-0.5 size-5 shrink-0 text-brand-600" /><span className="capitalize">{dayLabel(b.preferred_date)}, {b.time_slot_label}</span></li>
            <li className="flex gap-2.5"><MapPin className="mt-0.5 size-5 shrink-0 text-brand-600" />{b.address}{b.area ? `, ${b.area}` : ""}</li>
            {b.worker_code && <li className="flex gap-2.5"><UserCheck className="mt-0.5 size-5 shrink-0 text-brand-600" /><span>Ouvrier agréé <b data-testid="worker-code">{b.worker_code}</b></span></li>}</ul>
          {b.quote_amount !== null && <div className="rounded-2xl bg-brand-50 p-5"><p className="text-sm text-brand-700">Devis</p><p className="font-display text-3xl font-extrabold text-brand-700" data-testid="quote">{fcfa(b.quote_amount)}</p>
            <p className="mt-1 text-sm text-slate-600">À payer à la fin de l&apos;intervention, en espèces, Wave ou Orange Money.</p></div>}
          {b.status === "new" && <p className="rounded-2xl bg-surface p-4 text-sm text-slate-600">Un conseiller Lx vous contacte bientôt avec un devis.</p>}
          {b.payment && b.status !== "cancelled" && (b.payment.due > 0 || !!b.payment.pending || paidNow) && <PayPanel type="service" refNo={b.ref} phone={phone} failed={sp.get("pay") === "echec"} onPaid={() => { setPaidNow(true); load(b.ref, phone) }} />}
          {b.payment && b.payment.paid > 0 && <p className="text-sm text-slate-600" data-testid="paid-line">Payé : <b>{fcfa(b.payment.paid)}</b>{b.payment.due === 0 && b.payment.total > 0 ? " (soldé)" : ""}</p>}
          {b.can_review && <ReviewForm b={b} phone={phone} onDone={setB} />}
          {b.rating != null && <div className="rounded-2xl bg-surface p-5" data-testid="my-review"><p className="text-sm text-slate-500">Votre avis</p><Stars value={b.rating} className="size-6" />{b.review_text && <p className="mt-2 text-[15px] text-slate-700">{b.review_text}</p>}<p className="mt-2 text-sm text-slate-500">Merci, il aide les autres clients.</p></div>}
          <div className="flex flex-wrap gap-3">
            {b.status === "quoted" && <Button onClick={() => act("accept")} loading={busy} data-testid="accept-quote">Accepter le devis</Button>}
            {["new", "quoted", "confirmed"].includes(b.status) && <Button variant="secondary" onClick={() => act("cancel")} disabled={busy} data-testid="cancel-booking">Annuler la demande</Button>}
            {b.status === "done" && <Link href="/services" className="inline-flex items-center rounded-full bg-brand-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-700">Un autre service</Link>}</div>
        </article>)}
    </Container></>)
}
export default function Page() { return <Suspense><Inner /></Suspense> }
