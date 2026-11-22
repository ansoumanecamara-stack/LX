import Link from "next/link"
import Container from "@/components/ui/Container"
export default function NotFound() {
  return (<Container className="py-24 text-center"><h1 className="text-4xl font-extrabold">Page introuvable</h1><p className="mx-auto mt-3 max-w-md text-slate-600">Ce lien ne mène à rien. Retournez aux produits ou aux services pour continuer.</p>
    <div className="mt-8 flex justify-center gap-3"><Link href="/store" className="rounded-full bg-brand-600 px-6 py-3 text-sm font-bold text-white hover:bg-brand-700">Voir les produits</Link><Link href="/services" className="rounded-full border border-line px-6 py-3 text-sm font-bold hover:border-brand-600">Voir les services</Link></div></Container>)
}
