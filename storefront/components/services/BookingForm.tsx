"use client"
import { CalendarDays, CheckCircle2, MessageCircle } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import Banner from "@/components/ui/Banner"
import Button from "@/components/ui/Button"
import { Field, Input, Textarea } from "@/components/ui/Field"
import { cn } from "@/lib/cn"
import { useCustomer } from "@/lib/customer"
import { post } from "@/lib/medusa"
import { SLOTS, todayISO, type Booking, type Service } from "@/lib/services"

export default function BookingForm({ service }: { service: Service }) {
  const { customer } = useCustomer(), [slot, setSlot] = useState("any"), [busy, setBusy] = useState(false), [err, setErr] = useState("")
  const [done, setDone] = useState<{ booking: Booking; phone: string; whatsapp: string | null } | null>(null), [min, setMin] = useState("")
  useEffect(() => setMin(todayISO()), [])
  if (done) return (
    <div className="rounded-3xl bg-brand-50 p-7 animate-pop-in" data-testid="booking-done">
      <CheckCircle2 className="size-10 text-brand-600" />
      <h2 className="mt-3 text-2xl font-extrabold">Demande reçue</h2>
      <p className="mt-2 text-slate-700">Votre référence : <b className="font-display text-xl" data-testid="booking-ref">{done.booking.ref}</b></p>
      <p className="mt-2 leading-relaxed text-slate-600">Un conseiller Lx vous contacte avec un devis pour « {done.booking.service_name} ». Gardez cette référence et votre numéro de téléphone pour suivre la demande.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={`/services/suivi?ref=${done.booking.ref}&phone=${done.phone}`} className="inline-flex items-center rounded-full bg-brand-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-700">Suivre ma demande</Link>
        {done.whatsapp && <a href={done.whatsapp} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-6 py-3 text-sm font-bold transition hover:border-brand-600"><MessageCircle className="size-4" />Écrire à Lx sur WhatsApp</a>}</div></div>)
  return (
    <form className="space-y-4 rounded-3xl border border-line bg-white p-6 sm:p-7" data-testid="booking-form" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true); setErr(""); const f = new FormData(e.currentTarget)
      try { const r = await post("/store/lx/service-bookings", { service_slug: service.slug, name: f.get("name"), phone: f.get("phone"), address: f.get("address"), area: f.get("area"), date: f.get("date"), slot, details: f.get("details") }); setDone({ booking: r.booking, phone: String(f.get("phone")), whatsapp: r.whatsapp }) }
      catch (er: any) { setErr(er.message) } finally { setBusy(false) }
    }}>
      <h2 className="text-2xl font-extrabold">Demander une intervention</h2>
      {err && <Banner tone="danger">{err}</Banner>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom complet">{(id) => <Input id={id} name="name" autoComplete="name" required defaultValue={customer ? [customer.first_name, customer.last_name].filter(Boolean).join(" ") : ""} key={customer?.id ?? "anon"} />}</Field>
        <Field label="Téléphone / WhatsApp">{(id) => <Input id={id} name="phone" type="tel" inputMode="tel" autoComplete="tel" required defaultValue={customer?.phone ?? ""} key={customer?.id ?? "anon-p"} />}</Field></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Adresse de l'intervention">{(id) => <Input id={id} name="address" autoComplete="street-address" placeholder="Rue, immeuble, repère" required />}</Field>
        <Field label="Quartier ou ville">{(id) => <Input id={id} name="area" placeholder="Ex : Mermoz, Dakar" />}</Field></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Jour souhaité">{(id) => <Input id={id} name="date" type="date" min={min} required />}</Field>
        <div className="space-y-1.5"><span className="block text-[13px] font-semibold text-slate-700">Créneau</span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Créneau">{SLOTS.map(([k, l]) => <button type="button" key={k} role="radio" aria-checked={slot === k} data-testid={`slot-${k}`} onClick={() => setSlot(k)} className={cn("rounded-full border px-3.5 py-2 text-[13px] font-semibold transition", slot === k ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white hover:border-brand-600")}>{l}</button>)}</div></div></div>
      <Field label="Que faut-il faire ?" hint="Plus c'est précis, plus le devis est juste. Marque, modèle, photo envoyée ensuite par WhatsApp…">{(id) => <Textarea id={id} name="details" placeholder={`Ex : ${service.slug === "plomberie" ? "fuite sous l'évier de la cuisine" : service.slug === "electricite" ? "changer trois prises et un interrupteur" : "décrivez le travail à faire"}`} required />}</Field>
      <Button size="lg" loading={busy} className="w-full sm:w-auto"><CalendarDays className="size-5" />Envoyer ma demande</Button>
      <p className="text-xs text-slate-500">Aucun paiement maintenant. Vous recevez un devis, vous décidez.</p>
    </form>)
}
