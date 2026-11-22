import { BadgeCheck, ChevronLeft, HandCoins, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import BookingForm from "@/components/services/BookingForm"
import ServiceIcon from "@/components/services/ServiceIcon"
import Container from "@/components/ui/Container"
import { fcfa, img } from "@/lib/medusa"
import { getService } from "@/lib/services"
export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const s = await getService((await params).slug); return s ? { title: s.name, description: s.summary } : {}
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const s = await getService((await params).slug); if (!s) notFound()
  return (<>
    <section className="bg-surface"><Container className="pb-10 pt-8">
      <Link href="/services" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-brand-600"><ChevronLeft className="size-4" />Tous les services</Link>
      <div className="mt-5 grid items-center gap-8 lg:grid-cols-[1fr_1.1fr]">
        <div className="min-w-0">
          <h1 className="text-4xl font-extrabold leading-[1.05] sm:text-5xl" data-testid="service-title">{s.name}</h1>
          <p className="mt-4 max-w-lg text-lg leading-relaxed text-slate-600">{s.summary}</p>
          <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-brand-600 ring-1 ring-line"><HandCoins className="size-4" />{s.price_from ? `À partir de ${fcfa(s.price_from)}` : "Devis gratuit"}</p>
          {s.price_note && <p className="mt-2 text-sm text-slate-500">{s.price_note}</p>}</div>
        <div className="relative aspect-[16/9] overflow-hidden rounded-[2rem] bg-brand-600">
          {s.image_url
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={img(s.image_url)} alt={`Ouvrier agréé Lx, ${s.name}`} className="size-full object-cover" />
            : <div className="grid size-full place-items-center"><ServiceIcon name={s.icon} className="size-24 text-accent-500" /></div>}</div></div></Container></section>
    <Container className="grid gap-10 py-12 lg:grid-cols-[1fr_1.1fr]">
      <div className="min-w-0 space-y-8">
        {s.description && <div><h2 className="text-2xl font-extrabold">Ce que nous faisons</h2><p className="mt-3 max-w-prose leading-relaxed text-slate-700">{s.description}</p></div>}
        <ul className="space-y-4">
          <li className="flex gap-3"><BadgeCheck className="mt-0.5 size-6 shrink-0 text-brand-600" /><p className="text-slate-700"><b>Ouvriers agréés Lx.</b> Vous connaissez son identifiant avant son arrivée.</p></li>
          <li className="flex gap-3"><ShieldCheck className="mt-0.5 size-6 shrink-0 text-brand-600" /><p className="text-slate-700"><b>Devis avant le travail.</b> Le prix final est celui que vous avez accepté.</p></li>
          <li className="flex gap-3"><HandCoins className="mt-0.5 size-6 shrink-0 text-brand-600" /><p className="text-slate-700"><b>Paiement après l&apos;intervention</b>, en espèces, Wave ou Orange Money.</p></li></ul></div>
      <BookingForm service={s} /></Container>
  </>)
}
