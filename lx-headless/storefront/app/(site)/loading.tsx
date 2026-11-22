export default function Loading() {
  return (<div className="mx-auto max-w-6xl px-4 py-16" role="status" aria-label="Chargement"><div className="h-10 w-2/3 animate-pulse rounded-xl bg-slate-100" /><div className="mt-6 grid gap-4 sm:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-48 animate-pulse rounded-3xl bg-slate-100" />)}</div></div>)
}
