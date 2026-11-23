import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ChartBar } from "@medusajs/icons"
import { Badge, Button, Container, Heading, Text } from "@medusajs/ui"
import { useCallback, useEffect, useState } from "react"
import { api } from "./api"

type D = { days: number; since: string; commission: number; revenue: { orders: number; pos: number; services: number }; counts: Record<string, number>; orders_by_status: Record<string, number>; bookings_by_status: Record<string, number>; attention: Record<string, number>; series: { date: string; orders: number; pos: number; services: number }[]; top_services: { name: string; count: number; revenue: number; rating: number | null }[]; top_shops: { code: string; total: number }[]; satisfaction: { avg: number | null; count: number } }
const F = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} FCFA`
const COLORS = { orders: "#0B7A43", pos: "#F5B700", services: "#7C3AED" }
const LABELS = { orders: "Commandes livrées", pos: "Caisse boutiques", services: "Services terminés" }
const ST_ORDER: Record<string, string> = { pending: "En attente", confirmed: "Confirmées", rejected: "Refusées", picked_up: "En livraison", delivered: "Livrées", cancelled: "Annulées" }
const ST_BOOK: Record<string, string> = { new: "Reçues", quoted: "Devis envoyé", confirmed: "Confirmées", in_progress: "En cours", done: "Terminées", cancelled: "Annulées" }

const Kpi = ({ label, value, sub }: { label: string; value: string | number; sub?: string }) => (
  <div className="rounded-lg border border-ui-border-base bg-ui-bg-base p-4"><Text size="small" className="text-ui-fg-subtle">{label}</Text><Heading level="h2" className="mt-1">{value}</Heading>{sub && <Text size="small" className="text-ui-fg-subtle">{sub}</Text>}</div>
)
const Counts = ({ title, data, labels }: { title: string; data: Record<string, number>; labels: Record<string, string> }) => (
  <Container className="p-5"><Heading level="h3" className="mb-3">{title}</Heading>
    <div className="flex flex-wrap gap-2">{Object.entries(labels).map(([k, l]) => <div key={k} className="rounded-md bg-ui-bg-subtle px-3 py-2"><Text size="small" className="text-ui-fg-subtle">{l}</Text><Text weight="plus">{data[k] ?? 0}</Text></div>)}</div></Container>
)

const Chart = ({ series }: { series: D["series"] }) => {
  const W = 720, H = 200, pad = 6, max = Math.max(1, ...series.map((s) => s.orders + s.pos + s.services)), bw = (W - pad * 2) / series.length
  return (
    <svg viewBox={`0 0 ${W} ${H + 18}`} className="w-full" role="img" aria-label="Chiffre d'affaires par jour">
      {[0.25, 0.5, 0.75, 1].map((g) => <line key={g} x1={0} x2={W} y1={H - H * g} y2={H - H * g} stroke="currentColor" opacity={0.08} />)}
      {series.map((s, i) => { let y = H; const x = pad + i * bw
        return <g key={s.date}><title>{`${s.date} : ${F(s.orders + s.pos + s.services)}`}</title>
          {(["orders", "pos", "services"] as const).map((k) => { const h = (s[k] / max) * H; y -= h; return h > 0 ? <rect key={k} x={x + bw * 0.12} y={y} width={bw * 0.76} height={h} rx={2} fill={COLORS[k]} /> : null })}</g> })}
      <text x={pad} y={H + 14} fontSize="10" fill="currentColor" opacity={0.6}>{series[0]?.date}</text>
      <text x={W - pad} y={H + 14} fontSize="10" textAnchor="end" fill="currentColor" opacity={0.6}>{series[series.length - 1]?.date}</text>
    </svg>)
}

const Dashboard = () => {
  const [days, setDays] = useState(30), [d, setD] = useState<D | null>(null), [err, setErr] = useState("")
  const load = useCallback(async () => { try { setD(await api(`dashboard?days=${days}`)); setErr("") } catch (e: any) { setErr(e.message) } }, [days])
  useEffect(() => { load() }, [load])
  const total = d ? d.revenue.orders + d.revenue.pos + d.revenue.services : 0
  const a = d?.attention
  return (
    <div className="flex flex-col gap-4">
      <Container className="p-0"><div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
        <div><Heading>Tableau de bord Lx</Heading><Text className="text-ui-fg-subtle">Ventes, services et commandes sur la période choisie.</Text></div>
        <div className="flex gap-2">{[7, 30, 90].map((n) => <Button key={n} size="small" variant={days === n ? "primary" : "secondary"} onClick={() => setDays(n)}>{n} jours</Button>)}<Button size="small" variant="secondary" onClick={load}>Actualiser</Button></div></div>
        {err && <div className="px-6 pb-4"><Text className="text-ui-fg-error">{err}</Text></div>}</Container>

      {d && <>
        {a && (a.bookings_new + a.bookings_without_worker + a.orders_escalated + a.shops_pending > 0) && <Container className="p-5" data-testid="attention">
          <Heading level="h3" className="mb-3">À traiter maintenant</Heading>
          <div className="flex flex-wrap gap-2">
            {a.bookings_new > 0 && <Badge color="orange">{a.bookings_new} demande(s) de service sans devis</Badge>}
            {a.bookings_without_worker > 0 && <Badge color="red">{a.bookings_without_worker} demande(s) sans ouvrier</Badge>}
            {a.orders_escalated > 0 && <Badge color="red">{a.orders_escalated} commande(s) sans réponse boutique</Badge>}
            {a.shops_pending > 0 && <Badge color="blue">{a.shops_pending} boutique(s) à valider</Badge>}</div></Container>}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Chiffre d'affaires total" value={F(total)} sub={`depuis le ${d.since}`} />
          <Kpi label={LABELS.orders} value={F(d.revenue.orders)} sub={`${d.counts.orders_delivered} livrée(s) sur ${d.counts.orders}`} />
          <Kpi label={LABELS.pos} value={F(d.revenue.pos)} sub={`${d.counts.pos_sales} vente(s)`} />
          <Kpi label={LABELS.services} value={F(d.revenue.services)} sub={`${d.counts.bookings_done} sur ${d.counts.bookings} demande(s)`} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Satisfaction services" value={d.satisfaction.avg ? `${d.satisfaction.avg} / 5` : "Pas encore d'avis"} sub={`${d.satisfaction.count} avis`} />
          <Kpi label="Demandes OUTIKO / JEULIKO" value={d.counts.outiko_requests} />
          <Kpi label="Nouvelles boutiques" value={d.counts.new_shops} />
          <Kpi label="Commissions Lx (livraisons)" value={F(d.commission)} />
        </div>

        <Container className="p-5"><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><Heading level="h3">Chiffre d&apos;affaires par jour</Heading>
          <div className="flex gap-3">{(Object.keys(COLORS) as (keyof typeof COLORS)[]).map((k) => <span key={k} className="flex items-center gap-1.5 text-xs"><i className="inline-block size-2.5 rounded-sm" style={{ background: COLORS[k] }} />{LABELS[k]}</span>)}</div></div>
          <Chart series={d.series} /></Container>

        <div className="grid gap-4 lg:grid-cols-2"><Counts title="Commandes boutiques" data={d.orders_by_status} labels={ST_ORDER} /><Counts title="Demandes de services" data={d.bookings_by_status} labels={ST_BOOK} /></div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Container className="p-5"><Heading level="h3" className="mb-3">Services les plus demandés</Heading>
            {d.top_services.length ? d.top_services.map((s) => <div key={s.name} className="flex items-center justify-between border-t border-ui-border-base py-2 first:border-0"><Text>{s.name}</Text><Text size="small" className="text-ui-fg-subtle">{s.count} demande(s) · {F(s.revenue)}{s.rating ? ` · ${s.rating}/5` : ""}</Text></div>) : <Text className="text-ui-fg-subtle">Aucune demande sur la période.</Text>}</Container>
          <Container className="p-5"><Heading level="h3" className="mb-3">Boutiques en tête</Heading>
            {d.top_shops.length ? d.top_shops.map((s) => <div key={s.code} className="flex items-center justify-between border-t border-ui-border-base py-2 first:border-0"><Text>{s.code}</Text><Text size="small" className="text-ui-fg-subtle">{F(s.total)}</Text></div>) : <Text className="text-ui-fg-subtle">Aucune vente sur la période.</Text>}</Container>
        </div></>}
    </div>)
}
export const config = defineRouteConfig({ label: "Tableau de bord Lx", icon: ChartBar })
export default Dashboard
