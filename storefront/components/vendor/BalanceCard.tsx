"use client"
import { Wallet } from "lucide-react"
import { useEffect, useState } from "react"
import { Card, CardBody, CardHeader } from "@/components/ui/Card"
import { fcfa } from "@/lib/medusa"
import { vendorApi } from "@/lib/vendor"

type Data = { balance: { pos_commission: number; rate: number; gross: number; commission: number; lx_collected: number; paid_to_shop: number; received_from_shop: number; balance: number }; payouts: { ref: string; direction: string; amount: number; method: string; reference: string | null; created_at: string }[] }
const METHOD: Record<string, string> = { wave: "Wave", orange_money: "Orange Money", cash: "Espèces", bank: "Virement" }

/** Commission Lx et reversements : ce que la boutique doit ou doit recevoir. */
export default function BalanceCard() {
  const [d, setD] = useState<Data | null>(null)
  useEffect(() => { vendorApi("/balance").then(setD).catch(() => {}) }, [])
  if (!d?.balance) return null
  const b = d.balance
  return (
    <Card data-testid="balance-card"><CardHeader><h2 className="flex items-center gap-2 text-lg font-bold"><Wallet className="size-5 text-brand-600" />Commission et reversements</h2></CardHeader>
      <CardBody className="space-y-4">
        <p className="rounded-2xl bg-surface p-4 text-[15px]" data-testid="balance-line">
          {b.balance > 0 ? <>Lx vous doit <b>{fcfa(b.balance)}</b> (paiements encaissés pour vous, moins la commission).</> : b.balance < 0 ? <>Vous devez <b>{fcfa(-b.balance)}</b> de commission à Lx.</> : <>Vos comptes avec Lx sont à jour.</>}</p>
        <dl className="grid gap-3 text-sm sm:grid-cols-4">
          <div><dt className="text-slate-500">Commission Lx</dt><dd className="font-bold">{b.rate} %</dd></div>
          <div><dt className="text-slate-500">Commission sur vos livraisons</dt><dd className="font-bold">{fcfa(b.commission + b.pos_commission)}</dd></div>
          <div><dt className="text-slate-500">Encaissé par Lx pour vous</dt><dd className="font-bold">{fcfa(b.lx_collected)}</dd></div>
          <div><dt className="text-slate-500">Déjà réglé</dt><dd className="font-bold">{fcfa(b.paid_to_shop - b.received_from_shop)}</dd></div></dl>
        {d.payouts.length > 0 && <ul className="divide-y divide-line text-sm">{d.payouts.slice(0, 8).map((p) => <li key={p.ref} className="flex flex-wrap justify-between gap-2 py-2"><span>{new Date(p.created_at).toLocaleDateString("fr-FR")} · {p.direction === "to_shop" ? "Lx vous a versé" : "Vous avez versé à Lx"} · {METHOD[p.method] ?? p.method}</span><b>{fcfa(p.amount)}</b></li>)}</ul>}
      </CardBody></Card>)
}
