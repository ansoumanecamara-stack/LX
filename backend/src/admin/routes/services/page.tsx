import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Wrench } from "@medusajs/icons"
import { Badge, Button, Container, Heading, Input, Label, Text, Textarea } from "@medusajs/ui"
import { useCallback, useEffect, useRef, useState } from "react"
import { api } from "./api"

type Booking = { id: string; ref: string; service_name: string; customer_name: string; customer_phone: string; address: string; area: string | null; preferred_date: string; time_slot: string; details: string; status: string; quote_amount: number | null; worker_id: string | null; worker_code: string | null; admin_note: string | null; worker: { code: string; name: string; phone: string } | null; whatsapp_link: string; worker_whatsapp_link: string | null; rating: number | null; review_text: string | null; created_at: string }
type Worker = { id: string; code: string; name: string; phone: string; trades: string; zone: string | null; active: boolean; notes: string | null }
type Service = { id: string; slug: string; name: string; group: string; summary: string; description: string | null; image_url: string | null; icon: string; price_from: number | null; price_note: string | null; active: boolean; sort: number }
const TONE: Record<string, "orange" | "blue" | "green" | "red" | "grey" | "purple"> = { new: "orange", quoted: "blue", confirmed: "purple", in_progress: "blue", done: "green", cancelled: "red" }
const ICONS = ["wrench", "zap", "monitor", "hammer", "snowflake", "paintbrush", "key", "sparkles", "truck", "sprout", "tv", "wifi", "sofa", "droplets"]
const NEXT: Record<string, [string, string][]> = { new: [["cancelled", "Annuler"]], quoted: [["cancelled", "Annuler"]], confirmed: [["in_progress", "Démarrer l'intervention"], ["cancelled", "Annuler"]], in_progress: [["done", "Marquer terminée"]], done: [], cancelled: [] }
const toB64 = (f: File) => new Promise<string>((ok, ko) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(",")[1]); r.onerror = ko; r.readAsDataURL(f) })

const BookingCard = ({ b, workers, statuses, slots, reload, fail }: { b: Booking; workers: Worker[]; statuses: Record<string, string>; slots: Record<string, string>; reload: () => Promise<void>; fail: (m: string) => void }) => {
  const [quote, setQuote] = useState(b.quote_amount?.toString() ?? ""), [note, setNote] = useState(b.admin_note ?? ""), [busy, setBusy] = useState(false)
  const patch = async (body: any) => { setBusy(true); try { const r = await api(`service-bookings/${b.id}`, body); await reload(); if (r.worker_notified === false) fail("Ouvrier affecté, mais pas prévenu automatiquement (WhatsApp non configuré) : utilisez le bouton « WhatsApp ouvrier ». ") } catch (e: any) { fail(e.message) } finally { setBusy(false) } }
  const trade = (b.service_name || "").toLowerCase()
  const suited = workers.filter((w) => w.active)
  return (
    <div className="rounded-lg border border-ui-border-base bg-ui-bg-base p-4" data-testid="booking-row">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div><Text weight="plus">{b.ref} · {b.service_name}</Text><Text size="small" className="text-ui-fg-subtle">{b.customer_name} · {b.customer_phone}</Text></div>
        <Badge color={TONE[b.status] ?? "grey"}>{statuses[b.status] ?? b.status}</Badge></div>
      <Text size="small" className="mt-2">{b.address}{b.area ? `, ${b.area}` : ""}</Text>
      <Text size="small" className="text-ui-fg-subtle">{b.preferred_date} · {slots[b.time_slot] ?? b.time_slot}</Text>
      <Text size="small" className="mt-2 whitespace-pre-wrap">{b.details}</Text>
      {b.rating != null && <div className="mt-2 rounded-md bg-ui-bg-subtle p-2" data-testid="review"><Text size="small" weight="plus">Avis client : {"★".repeat(b.rating)}{"☆".repeat(5 - b.rating)} ({b.rating}/5)</Text>{b.review_text && <Text size="small" className="text-ui-fg-subtle">{b.review_text}</Text>}</div>}
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <div><Label size="small">Devis (FCFA)</Label>
          <div className="flex gap-2"><Input size="small" type="number" min={0} value={quote} onChange={(e) => setQuote(e.target.value)} aria-label="Devis" data-testid="quote-input" />
            <Button size="small" variant="secondary" isLoading={busy} onClick={() => patch({ quote_amount: quote })} data-testid="quote-save">Envoyer</Button></div></div>
        <div><Label size="small">Ouvrier agréé</Label>
          <select className="h-8 w-full rounded-md border border-ui-border-base bg-ui-bg-field px-2 text-sm" value={b.worker_id ?? ""} disabled={busy || ["done", "cancelled"].includes(b.status)} onChange={(e) => patch({ worker_id: e.target.value })} data-testid="worker-select">
            <option value="">Aucun</option>{suited.map((w) => <option key={w.id} value={w.id}>{w.code} · {w.name}{w.trades ? ` (${w.trades})` : ""}</option>)}</select>
          {b.worker && <Text size="small" className="mt-1 text-ui-fg-subtle">{b.worker.name} · {b.worker.phone}</Text>}</div>
        <div><Label size="small">Note interne</Label>
          <div className="flex gap-2"><Input size="small" value={note} onChange={(e) => setNote(e.target.value)} onBlur={() => note !== (b.admin_note ?? "") && patch({ admin_note: note })} aria-label="Note interne" /></div></div></div>
      <div className="mt-3 flex flex-wrap gap-2">
        {b.status === "quoted" && <Button size="small" isLoading={busy} onClick={() => patch({ status: "confirmed" })} data-testid="confirm">Confirmer (client d&apos;accord)</Button>}
        {(NEXT[b.status] ?? []).map(([s, l]) => <Button key={s} size="small" variant={s === "cancelled" ? "danger" : "primary"} isLoading={busy} onClick={() => patch({ status: s })}>{l}</Button>)}
        <a href={b.whatsapp_link} target="_blank" rel="noreferrer"><Button size="small" variant="secondary">WhatsApp client</Button></a>
        {b.worker_whatsapp_link && !["done", "cancelled"].includes(b.status) && <a href={b.worker_whatsapp_link} target="_blank" rel="noreferrer"><Button size="small" variant="secondary" data-testid="wa-worker">WhatsApp ouvrier</Button></a>}</div>
    </div>)
}

const ServicesPage = () => {
  const [tab, setTab] = useState<"bookings" | "catalogue" | "workers">("bookings"), [err, setErr] = useState(""), [msg, setMsg] = useState("")
  const [bookings, setBookings] = useState<Booking[]>([]), [statuses, setStatuses] = useState<Record<string, string>>({}), [slots, setSlots] = useState<Record<string, string>>({}), [filter, setFilter] = useState("all")
  const [workers, setWorkers] = useState<Worker[]>([]), [services, setServices] = useState<Service[]>([])
  const [sForm, setSForm] = useState<any>(null), [wForm, setWForm] = useState<any>(null), [busy, setBusy] = useState(false), file = useRef<HTMLInputElement>(null)
  const flash = (t: string) => { setMsg(t); setTimeout(() => setMsg(""), 3000) }
  const load = useCallback(async () => {
    try {
      const [b, w, s] = await Promise.all([api("service-bookings"), api("workers"), api("services")])
      setBookings(b.bookings); setStatuses(b.statuses); setSlots(b.slots); setWorkers(w.workers); setServices(s.services); setErr("")
    } catch (e: any) { setErr(e.message) }
  }, [])
  useEffect(() => { load() }, [load])

  const saveService = async () => {
    setBusy(true)
    try { await api(sForm.id ? `services/${sForm.id}` : "services", { ...sForm, price_from: sForm.price_from === "" ? null : sForm.price_from }); setSForm(null); await load(); flash("Service enregistré.") } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }
  const saveWorker = async () => {
    setBusy(true)
    try { await api(wForm.id ? `workers/${wForm.id}` : "workers", wForm); setWForm(null); await load(); flash("Ouvrier enregistré.") } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }
  const upload = async (f?: File) => {
    if (!f) return
    if (!/^image\/(jpeg|png|webp|gif)$/.test(f.type)) return setErr("Format accepté : JPG, PNG, WebP ou GIF.")
    if (f.size > 3 * 1024 * 1024) return setErr("Image trop lourde (3 Mo maximum).")
    setBusy(true)
    try { const d = await api("ad-images", { mime: f.type, base64: await toB64(f) }); setSForm((x: any) => ({ ...x, image_url: d.url })) } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }
  const shown = bookings.filter((b) => filter === "all" || b.status === filter)
  const count = (s: string) => bookings.filter((b) => b.status === s).length
  const tabBtn = (k: typeof tab, l: string) => <Button size="small" variant={tab === k ? "primary" : "secondary"} onClick={() => setTab(k)}>{l}</Button>

  return (
    <div className="flex flex-col gap-4">
      <Container className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div><Heading>Services à domicile</Heading><Text className="text-ui-fg-subtle">Demandes des clients, catalogue des services et ouvriers agréés.</Text></div>
          <div className="flex gap-2">{tabBtn("bookings", `Demandes${count("new") ? ` (${count("new")})` : ""}`)}{tabBtn("catalogue", "Catalogue")}{tabBtn("workers", "Ouvriers")}</div></div>
        {(err || msg) && <div className="px-6 pb-4"><Text className={err ? "text-ui-fg-error" : "text-ui-fg-interactive"}>{err || msg}</Text></div>}
      </Container>

      {tab === "bookings" && <Container className="p-6">
        <div className="mb-4 flex flex-wrap gap-2">{[["all", "Toutes"], ...Object.entries(statuses)].map(([k, l]) => <Button key={k} size="small" variant={filter === k ? "primary" : "secondary"} onClick={() => setFilter(k)}>{l}</Button>)}</div>
        <div className="flex flex-col gap-3">{shown.length ? shown.map((b) => <BookingCard key={b.id + b.status + (b.worker_id ?? "") + b.quote_amount} b={b} workers={workers} statuses={statuses} slots={slots} reload={load} fail={setErr} />) : <Text className="text-ui-fg-subtle">Aucune demande.</Text>}</div>
      </Container>}

      {tab === "catalogue" && <Container className="p-6">
        <div className="mb-4 flex items-center justify-between"><Heading level="h2">Services proposés</Heading><Button size="small" onClick={() => setSForm({ name: "", group: "Maison", summary: "", description: "", image_url: "", icon: "wrench", price_from: "", price_note: "", active: true, sort: 0 })}>Nouveau service</Button></div>
        {sForm && <div className="mb-6 grid gap-3 rounded-lg border border-ui-border-base p-4 md:grid-cols-2" data-testid="service-form">
          <div><Label>Nom</Label><Input value={sForm.name} onChange={(e) => setSForm({ ...sForm, name: e.target.value })} aria-label="Nom" /></div>
          <div><Label>Groupe</Label><Input value={sForm.group} onChange={(e) => setSForm({ ...sForm, group: e.target.value })} aria-label="Groupe" /></div>
          <div className="md:col-span-2"><Label>Résumé (une ligne)</Label><Input value={sForm.summary} onChange={(e) => setSForm({ ...sForm, summary: e.target.value })} aria-label="Résumé" /></div>
          <div className="md:col-span-2"><Label>Description</Label><Textarea value={sForm.description ?? ""} onChange={(e) => setSForm({ ...sForm, description: e.target.value })} aria-label="Description" /></div>
          <div><Label>Prix à partir de (FCFA)</Label><Input type="number" min={0} value={sForm.price_from ?? ""} onChange={(e) => setSForm({ ...sForm, price_from: e.target.value })} aria-label="Prix à partir de" /></div>
          <div><Label>Note de prix</Label><Input value={sForm.price_note ?? ""} onChange={(e) => setSForm({ ...sForm, price_note: e.target.value })} aria-label="Note de prix" /></div>
          <div><Label>Icône</Label><select className="h-8 w-full rounded-md border border-ui-border-base bg-ui-bg-field px-2 text-sm" value={sForm.icon} onChange={(e) => setSForm({ ...sForm, icon: e.target.value })}>{ICONS.map((i) => <option key={i}>{i}</option>)}</select></div>
          <div><Label>Ordre</Label><Input type="number" value={sForm.sort} onChange={(e) => setSForm({ ...sForm, sort: Number(e.target.value) })} aria-label="Ordre" /></div>
          <div className="md:col-span-2"><Label>Photo (facultatif)</Label>
            <div className="flex items-center gap-3">{sForm.image_url && <img src={sForm.image_url} alt="" className="h-16 w-24 rounded object-cover" />}
              <input ref={file} type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0])} /><Button size="small" variant="secondary" isLoading={busy} onClick={() => file.current?.click()}>Choisir une image</Button>
              {sForm.image_url && <Button size="small" variant="transparent" onClick={() => setSForm({ ...sForm, image_url: "" })}>Retirer</Button>}</div></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sForm.active} onChange={(e) => setSForm({ ...sForm, active: e.target.checked })} />Visible sur le site</label>
          <div className="flex justify-end gap-2 md:col-span-2"><Button variant="secondary" onClick={() => setSForm(null)}>Annuler</Button><Button isLoading={busy} disabled={!sForm.name.trim() || !sForm.summary.trim()} onClick={saveService} data-testid="service-save">Enregistrer</Button></div></div>}
        <div className="grid gap-3 md:grid-cols-2">{services.map((s) => (
          <div key={s.id} className="flex items-center gap-3 rounded-lg border border-ui-border-base p-3">
            {s.image_url ? <img src={s.image_url} alt="" className="h-14 w-20 rounded object-cover" /> : <div className="grid h-14 w-20 place-items-center rounded bg-ui-bg-subtle text-xs">{s.icon}</div>}
            <div className="min-w-0 flex-1"><Text weight="plus" className="truncate">{s.name}</Text><Text size="small" className="text-ui-fg-subtle">{s.group}{s.price_from ? ` · dès ${s.price_from} FCFA` : ""}</Text></div>
            <Badge color={s.active ? "green" : "grey"}>{s.active ? "En ligne" : "Masqué"}</Badge>
            <Button size="small" variant="secondary" onClick={() => setSForm({ ...s })}>Modifier</Button></div>))}</div>
      </Container>}

      {tab === "workers" && <Container className="p-6">
        <div className="mb-4 flex items-center justify-between"><div><Heading level="h2">Ouvriers agréés</Heading><Text size="small" className="text-ui-fg-subtle">Le client ne voit que l&apos;identifiant (OUV-0001), jamais le nom ni le téléphone.</Text></div><Button size="small" onClick={() => setWForm({ name: "", phone: "", trades: "", zone: "", notes: "", active: true })}>Nouvel ouvrier</Button></div>
        {wForm && <div className="mb-6 grid gap-3 rounded-lg border border-ui-border-base p-4 md:grid-cols-2" data-testid="worker-form">
          <div><Label>Nom</Label><Input value={wForm.name} onChange={(e) => setWForm({ ...wForm, name: e.target.value })} aria-label="Nom de l'ouvrier" /></div>
          <div><Label>Téléphone</Label><Input value={wForm.phone} onChange={(e) => setWForm({ ...wForm, phone: e.target.value })} aria-label="Téléphone de l'ouvrier" /></div>
          <div><Label>Métiers (séparés par des virgules)</Label><Input value={wForm.trades} onChange={(e) => setWForm({ ...wForm, trades: e.target.value })} aria-label="Métiers" /></div>
          <div><Label>Zone</Label><Input value={wForm.zone ?? ""} onChange={(e) => setWForm({ ...wForm, zone: e.target.value })} aria-label="Zone" /></div>
          <div className="md:col-span-2"><Label>Notes</Label><Input value={wForm.notes ?? ""} onChange={(e) => setWForm({ ...wForm, notes: e.target.value })} aria-label="Notes" /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={wForm.active} onChange={(e) => setWForm({ ...wForm, active: e.target.checked })} />Disponible</label>
          <div className="flex justify-end gap-2 md:col-span-2"><Button variant="secondary" onClick={() => setWForm(null)}>Annuler</Button><Button isLoading={busy} disabled={!wForm.name.trim() || !wForm.phone.trim()} onClick={saveWorker} data-testid="worker-save">Enregistrer</Button></div></div>}
        <div className="grid gap-3 md:grid-cols-2">{workers.map((w) => (
          <div key={w.id} className="flex items-center gap-3 rounded-lg border border-ui-border-base p-3">
            <div className="min-w-0 flex-1"><Text weight="plus">{w.code} · {w.name}</Text><Text size="small" className="text-ui-fg-subtle">{w.phone}{w.trades ? ` · ${w.trades}` : ""}{w.zone ? ` · ${w.zone}` : ""}</Text></div>
            <Badge color={w.active ? "green" : "grey"}>{w.active ? "Disponible" : "Indisponible"}</Badge>
            <Button size="small" variant="secondary" onClick={() => setWForm({ ...w })}>Modifier</Button></div>))}
          {!workers.length && <Text className="text-ui-fg-subtle">Aucun ouvrier. Ajoutez-en un pour pouvoir confirmer des interventions.</Text>}</div>
      </Container>}
    </div>)
}

export const config = defineRouteConfig({ label: "Services", icon: Wrench })
export default ServicesPage
