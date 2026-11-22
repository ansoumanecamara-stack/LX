import { Star } from "lucide-react"
export default function Stars({ value, className = "size-4" }: { value: number; className?: string }) {
  return (<span className="inline-flex" role="img" aria-label={`${value} sur 5`}>{[1, 2, 3, 4, 5].map((i) => <Star key={i} className={`${className} ${i <= Math.round(value) ? "fill-accent-500 text-accent-500" : "text-slate-300"}`} aria-hidden />)}</span>)
}
