import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CreditCard } from "@medusajs/icons"
import { Badge, Button, Container, Heading, Input, Label, Switch, Text, Textarea } from "@medusajs/ui"
import { useCallback, useEffect, useState } from "react"
import { api } from "./api"

type M = { enabled: boolean; label: string; mode: "manual" | "link" | "api"; merchant_number: string; merchant_name: string; link_template: string; instructions: string; fee_percent: number; fee_fixed: number; fee_payer: "customer" | "lx"; min_amount: number; max_amount: number; apply_products: boolean; apply_services: boolean; require_reference: boolean; expire_hours: number }
type Cfg = { methods: { wave: M; orange_money: M }; products: { online_mode: "direct" | "lx" }; services: { timing: "after" | "deposit" | "before"; deposit_percent: number; block_start_until_paid: boolean }; thanks_message: string }
type Pay = { id: string; ref: string; target_type: string; target_ref: string; customer_phone: string; method: string; mode: string; kind: string; amount: number; fee: number; charged: number; status: string; reference: string | null; note: string | null; paid_at: string | null; created_at: string }
type Sum = { paid_total: number; fees_total: number; paid_count: number; by_method: Record<string, number>; to_verify: number; pending: number }
type Bal = { pos_commission: number; shop_id: string; code: string; name: string; rate: number; delivered: number; gross: number; commission: number; lx_collected: number; shop_collected: number; paid_to_shop: number; received_from_shop: number; balance: number }
const F = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} FCFA`
const ST: Record<string, [string, "green" | "orange" | "red" | "grey" | "blue"]> = { pending: ["En attente", "orange"], paid: ["Payé", "green"], failed: ["Rejeté", "red"], expired: ["Expiré", "grey"], refunded: ["Remboursé", "blue"] }
const MODES: Record<string, string> = { manual: "Manuel : le client paie votre numéro et saisit la référence, vous vérifiez", link: "Lien de paiement : le client est envoyé sur votre lien (montant inclus), vous vérifiez", api: "API automatique : confirmation instantanée par Wave (aucune vérification)" }
const sel = "h-8 w-full rounded-md border border-ui-border-base bg-ui-bg-field px-2 text-sm"

const Row = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1"><Label size="small">{label}</Label>{children}{hint && <Text size="small" className="text-ui-fg-subtle">{hint}</Text>}</div>
)

const MethodCard = ({ id, m, set, env }: { id: "wave" | "orange_money"; m: M; set: (p: Partial<M>) => void; env: { api_key: boolean; webhook_secret: boolean } }) => (
  <Container className="p-5" data-testid={`method-${id}`}>
    <div className="mb-4 flex items-center justify-between"><div><Heading level="h2">{id === "wave" ? "Wave" : "Orange Money"}</Heading><Text size="small" className="text-ui-fg-subtle">{m.enabled ? "Proposé aux clients" : "Désactivé"}</Text></div>
      <Switch checked={m.enabled} onCheckedChange={(v) => set({ enabled: v })} aria-label={`Activer ${id}`} data-testid={`enable-${id}`} /></div>
    <div className="grid gap-4 md:grid-cols-2">
      <Row label="Nom affiché au client"><Input value={m.label} onChange={(e) => set({ label: e.target.value })} aria-label="Nom affiché" /></Row>
      <Row label="Mode d'encaissement" hint={MODES[m.mode]}>
        <select className={sel} value={m.mode} onChange={(e) => set({ mode: e.target.value as M["mode"] })} aria-label="Mode" data-testid={`mode-${id}`}>
          <option value="manual">Manuel (numéro marchand)</option><option value="link">Lien de paiement</option>{id === "wave" && <option value="api">API Wave (automatique)</option>}</select></Row>
      {m.mode === "manual" && <><Row label="Numéro marchand"><Input value={m.merchant_number} onChange={(e) => set({ merchant_number: e.target.value })} placeholder="77 000 00 00" aria-label="Numéro marchand" data-testid={`number-${id}`} /></Row>
        <Row label="Nom du bénéficiaire"><Input value={m.merchant_name} onChange={(e) => set({ merchant_name: e.target.value })} aria-label="Bénéficiaire" /></Row></>}
      {m.mode === "link" && <div className="md:col-span-2"><Row label="Lien de paiement" hint="Variables possibles : {amount} (montant), {ref} (référence du paiement), {phone}. Exemple Wave : https://pay.wave.com/m/M_sn_XXXX/c/sn/?amount={amount}">
        <Input value={m.link_template} onChange={(e) => set({ link_template: e.target.value })} placeholder="https://…?amount={amount}" aria-label="Lien de paiement" /></Row></div>}
      {m.mode === "api" && <div className="md:col-span-2 rounded-md bg-ui-bg-subtle p-3"><Text size="small">Clé API Wave : <Badge color={env.api_key ? "green" : "red"}>{env.api_key ? "présente" : "absente"}</Badge> · Secret webhook : <Badge color={env.webhook_secret ? "green" : "red"}>{env.webhook_secret ? "présent" : "absent"}</Badge></Text>
        <Text size="small" className="mt-2 text-ui-fg-subtle">Les clés ne se saisissent jamais ici : ajoutez <code>LX_WAVE_API_KEY</code> et <code>LX_WAVE_WEBHOOK_SECRET</code> (ou <code>LX_WAVE_SIGNING_SECRET</code>) dans les variables du serveur. Dans le tableau de bord Wave Business, l&apos;adresse du webhook est <code>&lt;adresse-de-l&apos;API&gt;/hooks/lx/wave</code>.</Text></div>}
      <Row label="Frais (%)" hint="Commission du moyen de paiement"><Input type="number" min={0} max={20} step={0.1} value={m.fee_percent} onChange={(e) => set({ fee_percent: Number(e.target.value) })} aria-label="Frais pourcentage" /></Row>
      <Row label="Frais fixes (FCFA)"><Input type="number" min={0} value={m.fee_fixed} onChange={(e) => set({ fee_fixed: Number(e.target.value) })} aria-label="Frais fixes" /></Row>
      <Row label="Qui paie les frais ?"><select className={sel} value={m.fee_payer} onChange={(e) => set({ fee_payer: e.target.value as M["fee_payer"] })} aria-label="Qui paie les frais"><option value="customer">Le client (ajoutés au montant)</option><option value="lx">Lx (absorbés)</option></select></Row>
      <Row label="Expiration d'un paiement non terminé (heures)"><Input type="number" min={1} max={720} value={m.expire_hours} onChange={(e) => set({ expire_hours: Number(e.target.value) })} aria-label="Expiration" /></Row>
      <Row label="Montant minimum (FCFA)" hint="0 = pas de minimum"><Input type="number" min={0} value={m.min_amount} onChange={(e) => set({ min_amount: Number(e.target.value) })} aria-label="Minimum" /></Row>
      <Row label="Montant maximum (FCFA)" hint="0 = pas de maximum"><Input type="number" min={0} value={m.max_amount} onChange={(e) => set({ max_amount: Number(e.target.value) })} aria-label="Maximum" /></Row>
      <div className="md:col-span-2"><Row label="Consignes affichées au client (facultatif)"><Textarea value={m.instructions} onChange={(e) => set({ instructions: e.target.value })} aria-label="Consignes" /></Row></div>
      <div className="flex flex-wrap gap-6 md:col-span-2">
        <label className="flex items-center gap-2 text-sm"><Switch checked={m.apply_products} onCheckedChange={(v) => set({ apply_products: v })} />Commandes de produits</label>
        <label className="flex items-center gap-2 text-sm"><Switch checked={m.apply_services} onCheckedChange={(v) => set({ apply_services: v })} />Services à domicile</label>
        {m.mode !== "api" && <label className="flex items-center gap-2 text-sm"><Switch checked={m.require_reference} onCheckedChange={(v) => set({ require_reference: v })} />Référence de transaction obligatoire</label>}</div>
    </div></Container>)

const PaiementsPage = () => {
  const [tab, setTab] = useState<"tx" | "settings" | "shops">("tx"), [err, setErr] = useState(""), [msg, setMsg] = useState("")
  const [cfg, setCfg] = useState<Cfg | null>(null), [env, setEnv] = useState({ api_key: false, webhook_secret: false }), [hook, setHook] = useState(""), [busy, setBusy] = useState(false)
  const [pays, setPays] = useState<Pay[]>([]), [sum, setSum] = useState<Sum | null>(null), [fStatus, setFStatus] = useState("all"), [cash, setCash] = useState<any>(null)
  const [bal, setBal] = useState<Bal[]>([]), [pOuts, setPOuts] = useState<any[]>([]), [tot, setTot] = useState<any>(null), [com, setCom] = useState<{ enabled: boolean; apply_pos: boolean; default_percent: number; per_shop: Record<string, number | string> }>({ enabled: true, apply_pos: false, default_percent: 0, per_shop: {} }), [pform, setPform] = useState<any>(null)
  const flash = (t: string) => { setMsg(t); setTimeout(() => setMsg(""), 3500) }
  const loadSettings = useCallback(async () => { try { const d = await api("payment-settings"); setCfg(d.config); setEnv(d.env); setHook(d.webhook_path) } catch (e: any) { setErr(e.message) } }, [])
  const loadTx = useCallback(async () => { try { const d = await api(`payments${fStatus === "all" ? "" : `?status=${fStatus}`}`); setPays(d.payments); setSum(d.summary); setErr("") } catch (e: any) { setErr(e.message) } }, [fStatus])
  const loadShops = useCallback(async () => { try { const [p, c] = await Promise.all([api("payouts"), api("commission")]); setBal(p.balances); setPOuts(p.payouts); setTot(p.totals); setCom(c.config) } catch (e: any) { setErr(e.message) } }, [])
  useEffect(() => { loadShops() }, [loadShops])
  const saveCom = async () => { try { const d = await api("commission", com); setCom(d.config); await loadShops(); flash("Commission enregistrée.") } catch (e: any) { setErr(e.message) } }
  const savePayout = async () => { try { await api("payouts", pform); setPform(null); await loadShops(); flash("Reversement enregistré.") } catch (e: any) { setErr(e.message) } }
  useEffect(() => { loadSettings() }, [loadSettings]); useEffect(() => { loadTx() }, [loadTx])
  const setM = (id: "wave" | "orange_money", p: Partial<M>) => setCfg((c) => c && { ...c, methods: { ...c.methods, [id]: { ...c.methods[id], ...p } } })
  const save = async () => { setBusy(true); try { const d = await api("payment-settings", cfg); setCfg(d.config); setErr(""); flash("Réglages enregistrés.") } catch (e: any) { setErr(e.message); window.scrollTo({ top: 0, behavior: "smooth" }) } finally { setBusy(false) } }
  const act = async (id: string, action: string) => {
    const note = action === "reject" || action === "refund" ? window.prompt(action === "reject" ? "Motif du rejet (facultatif)" : "Motif du remboursement (facultatif)") ?? undefined : undefined
    if (note === undefined && (action === "reject" || action === "refund")) return
    try { await api(`payments/${id}`, { action, note }); await loadTx(); flash("Paiement mis à jour.") } catch (e: any) { setErr(e.message) }
  }
  const saveCash = async () => { try { await api("payments", cash); setCash(null); await loadTx(); flash("Encaissement enregistré.") } catch (e: any) { setErr(e.message) } }
  const tabBtn = (k: typeof tab, l: string) => <Button size="small" variant={tab === k ? "primary" : "secondary"} onClick={() => setTab(k)} data-testid={`tab-${k}`}>{l}</Button>

  return (
    <div className="flex flex-col gap-4">
      <Container className="p-0"><div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
        <div><Heading>Paiements</Heading><Text className="text-ui-fg-subtle">Wave et Orange Money : réglages, vérification et suivi des transactions.</Text></div>
        <div className="flex gap-2">{tabBtn("tx", `Transactions${sum?.to_verify ? ` (${sum.to_verify} à vérifier)` : ""}`)}{tabBtn("shops", "Boutiques")}{tabBtn("settings", "Réglages")}</div></div>
        {(err || msg) && <div className="px-6 pb-4"><Text className={err ? "text-ui-fg-error" : "text-ui-fg-interactive"}>{err || msg}</Text></div>}</Container>

      {tab === "tx" && <>
        {sum && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[["Encaissé", F(sum.paid_total), `${sum.paid_count} paiement(s)`], ["Wave", F(sum.by_method.wave), ""], ["Orange Money", F(sum.by_method.orange_money), ""], ["Espèces saisies", F(sum.by_method.cash), `${F(sum.fees_total)} de frais`]].map(([l, v, s]) => <div key={l} className="rounded-lg border border-ui-border-base bg-ui-bg-base p-4"><Text size="small" className="text-ui-fg-subtle">{l}</Text><Heading level="h2" className="mt-1">{v}</Heading><Text size="small" className="text-ui-fg-subtle">{s}</Text></div>)}</div>}
        <Container className="p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">{[["all", "Tous"], ...Object.entries(ST).map(([k, v]) => [k, v[0]])].map(([k, l]) => <Button key={k} size="small" variant={fStatus === k ? "primary" : "secondary"} onClick={() => setFStatus(k)}>{l}</Button>)}</div>
            <Button size="small" onClick={() => setCash({ type: "service", ref: "", amount: "", method: "cash", reference: "", note: "" })} data-testid="new-cash">Saisir un encaissement</Button></div>
          {cash && <div className="mb-5 grid gap-3 rounded-lg border border-ui-border-base p-4 md:grid-cols-5">
            <Row label="Pour"><select className={sel} value={cash.type} onChange={(e) => setCash({ ...cash, type: e.target.value })} aria-label="Type"><option value="service">Demande de service</option><option value="order">Commande produits</option></select></Row>
            <Row label={cash.type === "service" ? "Référence (SRV-10001)" : "N° de commande"}><Input value={cash.ref} onChange={(e) => setCash({ ...cash, ref: e.target.value })} aria-label="Référence" /></Row>
            <Row label="Montant (FCFA)"><Input type="number" value={cash.amount} onChange={(e) => setCash({ ...cash, amount: e.target.value })} aria-label="Montant" /></Row>
            <Row label="Moyen"><select className={sel} value={cash.method} onChange={(e) => setCash({ ...cash, method: e.target.value })} aria-label="Moyen"><option value="cash">Espèces</option><option value="wave">Wave</option><option value="orange_money">Orange Money</option></select></Row>
            <div className="flex items-end gap-2"><Button size="small" onClick={saveCash} disabled={!cash.ref || !cash.amount}>Enregistrer</Button><Button size="small" variant="secondary" onClick={() => setCash(null)}>Annuler</Button></div></div>}
          <div className="flex flex-col gap-2">{pays.length ? pays.map((p) => { const [l, c] = ST[p.status] ?? [p.status, "grey" as const]; return (
            <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-ui-border-base p-3" data-testid="pay-row">
              <div className="min-w-[180px] flex-1"><Text weight="plus">{p.ref} · {F(p.charged)}</Text><Text size="small" className="text-ui-fg-subtle">{p.target_type === "order" ? `Commande #${p.target_ref}` : p.target_ref} · {p.method === "cash" ? "Espèces" : p.method === "wave" ? "Wave" : "Orange Money"} ({p.mode}) · {p.customer_phone}</Text>
                {p.reference && <Text size="small">Réf. client : <b>{p.reference}</b></Text>}{p.note && <Text size="small" className="text-ui-fg-subtle">{p.note}</Text>}</div>
              <Badge color={c}>{l}</Badge>
              <div className="flex gap-2">
                {["pending", "expired", "failed"].includes(p.status) && <Button size="small" onClick={() => act(p.id, "confirm")} data-testid="confirm-pay">Confirmer reçu</Button>}
                {p.status === "pending" && <Button size="small" variant="danger" onClick={() => act(p.id, "reject")}>Rejeter</Button>}
                {p.status === "paid" && <Button size="small" variant="secondary" onClick={() => act(p.id, "refund")}>Rembourser</Button>}</div></div>) }) : <Text className="text-ui-fg-subtle">Aucun paiement.</Text>}</div>
        </Container></>}

      {tab === "shops" && <>
        {tot && <div className="grid gap-3 sm:grid-cols-3">{[["Commissions Lx (livré)", F(tot.commission)], ["Lx doit aux boutiques", F(tot.owed_to_shops)], ["Les boutiques doivent à Lx", F(tot.owed_by_shops)]].map(([l, v]) => <div key={l} className="rounded-lg border border-ui-border-base bg-ui-bg-base p-4"><Text size="small" className="text-ui-fg-subtle">{l}</Text><Heading level="h2" className="mt-1">{v}</Heading></div>)}</div>}
        <Container className="p-5"><div className="mb-1 flex items-center justify-between"><Heading level="h2">Commission Lx</Heading><label className="flex items-center gap-2 text-sm"><Switch checked={com.enabled} onCheckedChange={(v) => setCom({ ...com, enabled: v })} aria-label="Activer la commission" data-testid="com-enabled" />{com.enabled ? "Activée" : "Désactivée"}</label></div>
          <Text size="small" className="mb-4 text-ui-fg-subtle">{com.enabled ? "Pourcentage prélevé sur le montant des produits des commandes livrées. Le taux est figé au moment de la livraison. Laissez vide pour appliquer le taux par défaut." : "Aucune commission n'est prélevée sur les nouvelles ventes. L'historique déjà enregistré reste inchangé."}</Text>
          <label className="mb-4 flex items-center gap-2 text-sm"><Switch checked={com.apply_pos} onCheckedChange={(v) => setCom({ ...com, apply_pos: v })} disabled={!com.enabled} aria-label="Commission sur les ventes en caisse" data-testid="com-pos" />Appliquer aussi la commission aux ventes faites en caisse dans les boutiques</label>
          <div className="grid gap-4 md:grid-cols-4"><Row label="Taux par défaut (%)"><Input type="number" min={0} max={50} step={0.5} value={com.default_percent} onChange={(e) => setCom({ ...com, default_percent: Number(e.target.value) })} aria-label="Commission par défaut" data-testid="com-default" /></Row>
            {bal.map((b) => <Row key={b.shop_id} label={`${b.code} · ${b.name}`}><Input type="number" min={0} max={50} step={0.5} placeholder={String(com.default_percent)} value={com.per_shop[b.shop_id] ?? ""} onChange={(e) => setCom({ ...com, per_shop: { ...com.per_shop, [b.shop_id]: e.target.value } })} aria-label={`Commission ${b.code}`} /></Row>)}</div>
          <Button className="mt-4" onClick={saveCom} data-testid="com-save">Enregistrer la commission</Button></Container>
        <Container className="p-5"><div className="mb-3 flex items-center justify-between"><div><Heading level="h2">Soldes des boutiques</Heading><Text size="small" className="text-ui-fg-subtle">Solde = encaissé par Lx pour la boutique − commission − reversements déjà faits. Positif : vous devez de l&apos;argent à la boutique. Négatif : la boutique vous doit sa commission.</Text></div></div>
          {pform && <div className="mb-4 grid gap-3 rounded-lg border border-ui-border-base p-4 md:grid-cols-5" data-testid="payout-form">
            <Row label="Sens"><select className={sel} value={pform.direction} onChange={(e) => setPform({ ...pform, direction: e.target.value })} aria-label="Sens"><option value="to_shop">Lx paie la boutique</option><option value="from_shop">La boutique paie Lx</option></select></Row>
            <Row label="Montant (FCFA)"><Input type="number" value={pform.amount} onChange={(e) => setPform({ ...pform, amount: e.target.value })} aria-label="Montant du reversement" data-testid="payout-amount" /></Row>
            <Row label="Moyen"><select className={sel} value={pform.method} onChange={(e) => setPform({ ...pform, method: e.target.value })} aria-label="Moyen du reversement"><option value="wave">Wave</option><option value="orange_money">Orange Money</option><option value="cash">Espèces</option><option value="bank">Virement</option></select></Row>
            <Row label="Référence"><Input value={pform.reference} onChange={(e) => setPform({ ...pform, reference: e.target.value })} aria-label="Référence du reversement" /></Row>
            <div className="flex items-end gap-2"><Button size="small" onClick={savePayout} disabled={!pform.amount} data-testid="payout-save">Enregistrer</Button><Button size="small" variant="secondary" onClick={() => setPform(null)}>Annuler</Button></div></div>}
          <div className="flex flex-col gap-2">{bal.map((b) => <div key={b.shop_id} className="flex flex-wrap items-center gap-3 rounded-lg border border-ui-border-base p-3" data-testid="balance-row">
            <div className="min-w-[200px] flex-1"><Text weight="plus">{b.code} · {b.name}</Text><Text size="small" className="text-ui-fg-subtle">{b.delivered} livraison(s) · {F(b.gross)} · commission {b.rate} % = {F(b.commission)}{b.pos_commission ? ` + ${F(b.pos_commission)} (caisse)` : ""} · encaissé par Lx {F(b.lx_collected)}</Text></div>
            <Badge color={b.balance > 0 ? "orange" : b.balance < 0 ? "red" : "green"} data-testid="balance-badge">{b.balance > 0 ? `Lx doit ${F(b.balance)}` : b.balance < 0 ? `Boutique doit ${F(-b.balance)}` : "À jour"}</Badge>
            <Button size="small" variant="secondary" onClick={() => setPform({ shop_id: b.shop_id, direction: b.balance < 0 ? "from_shop" : "to_shop", amount: Math.abs(b.balance) || "", method: "wave", reference: "", note: "" })} data-testid="new-payout">Enregistrer un reversement</Button></div>)}</div></Container>
        <Container className="p-5"><Heading level="h2" className="mb-3">Historique des reversements</Heading>{pOuts.length ? pOuts.map((p) => <div key={p.id} className="flex flex-wrap justify-between gap-2 border-t border-ui-border-base py-2 first:border-0" data-testid="payout-row"><Text>{p.ref} · {p.shop_code} · {p.direction === "to_shop" ? "Lx → boutique" : "boutique → Lx"}</Text><Text size="small" className="text-ui-fg-subtle">{F(p.amount)} · {p.method}{p.reference ? ` · ${p.reference}` : ""} · {new Date(p.created_at).toLocaleDateString("fr-FR")}</Text></div>) : <Text className="text-ui-fg-subtle">Aucun reversement enregistré.</Text>}</Container></>}

      {tab === "settings" && cfg && <>
        <MethodCard id="wave" m={cfg.methods.wave} set={(p) => setM("wave", p)} env={env} />
        <MethodCard id="orange_money" m={cfg.methods.orange_money} set={(p) => setM("orange_money", p)} env={env} />
        <Container className="p-5"><Heading level="h2" className="mb-4">Commandes de produits</Heading>
          <Row label="Qui encaisse ?" hint={cfg.products.online_mode === "direct" ? "Chaque boutique est payée directement sur son propre numéro Wave / Orange Money (comportement actuel)." : "Lx encaisse le montant des produits sur ses numéros marchands (ci-dessus). Les frais de livraison restent à régler au livreur."}>
            <select className={sel} value={cfg.products.online_mode} onChange={(e) => setCfg({ ...cfg, products: { online_mode: e.target.value as "direct" | "lx" } })} aria-label="Qui encaisse" data-testid="products-mode"><option value="direct">Chaque boutique, directement</option><option value="lx">Lx encaisse pour les boutiques</option></select></Row></Container>
        <Container className="p-5"><Heading level="h2" className="mb-4">Services à domicile</Heading>
          <div className="grid gap-4 md:grid-cols-3">
            <Row label="Quand le client paie-t-il ?" hint={{ after: "Après l'intervention (paiement en ligne possible une fois terminée).", deposit: "Un acompte à la confirmation, le solde après l'intervention.", before: "La totalité à la confirmation du devis." }[cfg.services.timing]}>
              <select className={sel} value={cfg.services.timing} onChange={(e) => setCfg({ ...cfg, services: { ...cfg.services, timing: e.target.value as Cfg["services"]["timing"] } })} aria-label="Calendrier" data-testid="svc-timing"><option value="after">Après l&apos;intervention</option><option value="deposit">Acompte puis solde</option><option value="before">Totalité avant</option></select></Row>
            {cfg.services.timing === "deposit" && <Row label="Acompte (% du devis)"><Input type="number" min={1} max={100} value={cfg.services.deposit_percent} onChange={(e) => setCfg({ ...cfg, services: { ...cfg.services, deposit_percent: Number(e.target.value) } })} aria-label="Acompte" /></Row>}
            {cfg.services.timing !== "after" && <label className="flex items-center gap-2 pt-6 text-sm"><Switch checked={cfg.services.block_start_until_paid} onCheckedChange={(v) => setCfg({ ...cfg, services: { ...cfg.services, block_start_until_paid: v } })} />Bloquer le démarrage tant que ce n&apos;est pas payé</label>}</div></Container>
        <Container className="p-5"><Row label="Message affiché après un paiement"><Input value={cfg.thanks_message} onChange={(e) => setCfg({ ...cfg, thanks_message: e.target.value })} aria-label="Message de remerciement" /></Row>
          <div className="mt-4 flex items-center gap-3"><Button onClick={save} isLoading={busy} data-testid="save-settings">Enregistrer les réglages</Button><Text size="small" className="text-ui-fg-subtle">Webhook Wave : <code>{hook}</code></Text></div></Container></>}
    </div>)
}
export const config = defineRouteConfig({ label: "Paiements", icon: CreditCard })
export default PaiementsPage
