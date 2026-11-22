import { ArrowUpRight } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/cn"
import { fcfa, img } from "@/lib/medusa"
import type { Service } from "@/lib/services"
import ServiceIcon from "./ServiceIcon"
import Stars from "./Stars"

/** Carte de service : photo quand elle existe, sinon grande icône sur fond de marque. */
export default function ServiceCard({ s, className }: { s: Service; className?: string }) {
  return (
    <Link href={`/services/${s.slug}`} data-testid="service-card" className={cn("group relative flex flex-col overflow-hidden rounded-3xl border border-line bg-white transition duration-300 hover:-translate-y-1 hover:border-brand-600 hover:shadow-[0_24px_44px_-28px_rgba(16,35,26,0.45)]", className)}>
      <div className="relative aspect-[16/10] overflow-hidden bg-brand-50">
        {s.image_url
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={img(s.image_url)} alt="" loading="lazy" className="size-full object-cover transition duration-700 group-hover:scale-105" />
          : <div className="grid size-full place-items-center bg-brand-600"><ServiceIcon name={s.icon} className="size-14 text-accent-500 transition duration-500 group-hover:scale-110 group-hover:-rotate-6" /></div>}
        <span className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-white text-ink opacity-0 shadow transition group-hover:opacity-100"><ArrowUpRight className="size-4" /></span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-xl font-bold leading-tight">{s.name}</h3>
        <p className="mt-1.5 flex-1 text-sm leading-relaxed text-slate-600">{s.summary}</p>
        {s.rating && <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500"><Stars value={s.rating.avg} className="size-3.5" />{s.rating.avg} ({s.rating.count})</p>}
        <p className="mt-4 text-sm font-bold text-brand-600">{s.price_from ? `À partir de ${fcfa(s.price_from)}` : "Devis gratuit"}</p>
      </div>
    </Link>
  )
}
