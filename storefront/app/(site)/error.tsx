"use client"
import Container from "@/components/ui/Container"
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (<Container className="py-24 text-center"><h1 className="text-3xl font-extrabold">Le service ne répond pas</h1><p className="mx-auto mt-3 max-w-md text-slate-600">Le serveur démarre peut-être (il se met en veille quand personne ne l&apos;utilise). Réessayez dans quelques secondes.</p>
    <button onClick={reset} className="mt-8 rounded-full bg-brand-600 px-6 py-3 text-sm font-bold text-white hover:bg-brand-700">Réessayer</button></Container>)
}
