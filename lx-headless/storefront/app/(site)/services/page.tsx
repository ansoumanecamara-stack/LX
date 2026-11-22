import { ClipboardList, HandCoins, MessageSquareQuote, UserCheck } from "lucide-react"
import Link from "next/link"
import type { Metadata } from "next"
import ServiceCard from "@/components/services/ServiceCard"
import Container from "@/components/ui/Container"
import PageHeader from "@/components/ui/PageHeader"
import { listServices } from "@/lib/services"
export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Services à domicile", description: "Plomberie, électricité, informatique, maçonnerie et plus : des ouvriers agréés Lx chez vous, sur rendez-vous." }

const STEPS = [
  { icon: ClipboardList, t: "Vous décrivez", d: "Le service, l'adresse, le jour et le créneau qui vous arrangent." },
  { icon: MessageSquareQuote, t: "On vous envoie un devis", d: "Un conseiller Lx vous contacte et fixe le prix avant tout travail." },
  { icon: UserCheck, t: "Un ouvrier agréé vient", d: "Vous connaissez son identifiant Lx avant son arrivée." },
  { icon: HandCoins, t: "Vous payez après le travail", d: "Espèces, Wave ou Orange Money, une fois satisfait." },
]

export default async function ServicesPage() {
  const services = await listServices()
  const groups = [...new Set(services.map((s) => s.group))]
  return (<>
    <PageHeader title="Un ouvrier agréé Lx chez vous">
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">Plomberie, électricité, informatique, bricolage et bien d&apos;autres services. Nos ouvriers du week-end agréés interviennent sur rendez-vous, avec un devis donné avant de commencer.</p></PageHeader>
    <Container className="py-12">
      {!services.length ? <p className="rounded-3xl border border-dashed border-line p-10 text-center text-slate-500">Les services arrivent bientôt.</p> : groups.map((g) => (
        <section key={g} className="mb-14 last:mb-0" aria-labelledby={`g-${g}`}>
          <h2 id={`g-${g}`} className="mb-5 text-2xl font-extrabold">{g}</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{services.filter((s) => s.group === g).map((s) => <ServiceCard key={s.id} s={s} />)}</div></section>))}
      <p className="mt-12 rounded-3xl bg-surface p-6 text-[15px] leading-relaxed text-slate-600">Un besoin qui n&apos;est pas dans la liste ? <Link href="/outiko?type=outiko" className="font-bold text-brand-600 underline decoration-accent-500 decoration-2 underline-offset-4">Décrivez-le nous</Link>, l&apos;équipe Lx trouve la bonne personne.</p>
    </Container>
    <section className="bg-surface py-16"><Container>
      <h2 className="mb-10 max-w-xl text-3xl font-extrabold leading-tight sm:text-4xl">Comment ça se passe</h2>
      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{STEPS.map((s) => (<li key={s.t} className="rounded-3xl bg-white p-6 ring-1 ring-line"><s.icon className="size-8 text-brand-600" /><h3 className="mt-4 font-display text-lg font-bold">{s.t}</h3><p className="mt-1.5 text-sm leading-relaxed text-slate-600">{s.d}</p></li>))}</ol>
      <p className="mt-10 max-w-2xl border-l-4 border-accent-500 pl-5 text-[15px] leading-relaxed text-slate-600">Le prix final est celui du devis que vous acceptez. L&apos;ouvrier ne peut pas le modifier sans votre accord.</p>
    </Container></section>
  </>)
}
