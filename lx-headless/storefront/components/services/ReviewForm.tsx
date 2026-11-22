"use client"
import { useState } from "react"
import Banner from "@/components/ui/Banner"
import Button from "@/components/ui/Button"
import { Textarea } from "@/components/ui/Field"
import { cn } from "@/lib/cn"
import { post } from "@/lib/medusa"
import type { Booking } from "@/lib/services"
import { Star } from "lucide-react"

export default function ReviewForm({ b, phone, onDone }: { b: Booking; phone: string; onDone: (b: Booking) => void }) {
  const [v, setV] = useState(0), [hover, setHover] = useState(0), [busy, setBusy] = useState(false), [err, setErr] = useState("")
  return (
    <form className="space-y-4 rounded-2xl bg-surface p-5" data-testid="review-form" onSubmit={async (e) => {
      e.preventDefault(); if (!v) return setErr("Choisissez une note de 1 à 5."); setBusy(true); setErr("")
      try { onDone((await post(`/store/lx/service-bookings/${b.ref}/review`, { phone, rating: v, comment: new FormData(e.currentTarget).get("comment") })).booking) } catch (er: any) { setErr(er.message) } finally { setBusy(false) }
    }}>
      <h3 className="font-display text-lg font-bold">Comment s&apos;est passée l&apos;intervention ?</h3>
      {err && <Banner tone="danger">{err}</Banner>}
      <div className="flex gap-1" role="radiogroup" aria-label="Note">{[1, 2, 3, 4, 5].map((i) => (
        <button type="button" key={i} role="radio" aria-checked={v === i} aria-label={`${i} sur 5`} data-testid={`star-${i}`} onClick={() => setV(i)} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(0)} className="rounded p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600">
          <Star className={cn("size-9 transition", i <= (hover || v) ? "fill-accent-500 text-accent-500" : "text-slate-300")} aria-hidden /></button>))}</div>
      <Textarea name="comment" placeholder="Ponctualité, qualité du travail, propreté… (facultatif)" maxLength={600} />
      <Button loading={busy} data-testid="review-send">Envoyer mon avis</Button>
    </form>)
}
