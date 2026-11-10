export function BrandHeader() {
  return (
    <header className="flex items-center justify-between border-b border-white/10 py-5 text-white">
      <a href="/" className="inline-flex items-center gap-3" aria-label="Roadwise home">
        <span className="grid size-10 place-items-center rounded-xl bg-amber-300 text-xl font-black text-slate-950">
          R
        </span>
        <span className="text-lg font-bold tracking-tight">roadwise</span>
      </a>
      <span className="hidden items-center gap-2 text-sm text-slate-300 sm:inline-flex">
        <span className="size-2 rounded-full bg-emerald-400" />
        Built for the road ahead
      </span>
    </header>
  )
}
