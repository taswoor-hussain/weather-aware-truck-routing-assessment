import { BrandHeader } from './BrandHeader'
import { TripForm } from './TripForm'

const highlights = [
  { value: '3', label: 'route options' },
  { value: '48h', label: 'weather outlook' },
  { value: 'ETA', label: 'checkpoint timing' },
]

export function TripPlannerPage() {
  return (
    <main className="min-h-screen bg-slate-100">
      <div className="bg-[radial-gradient(ellipse_at_75%_0%,rgba(28,111,100,0.44),transparent_42%),linear-gradient(125deg,#0b1720_0%,#122631_55%,#173b42_100%)]">
        <div className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-7 lg:px-10">
          <BrandHeader />
          <div className="grid items-center gap-10 pb-8 pt-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:pb-16 lg:pt-16">
            <section className="max-w-xl text-white">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold tracking-wide text-teal-100">
                <span className="size-1.5 rounded-full bg-amber-300" />
                WEATHER-AWARE TRUCK ROUTING
              </p>
              <h1 className="mt-6 text-4xl font-semibold leading-[1.07] tracking-[-0.045em] sm:text-5xl lg:text-[3.55rem]">
                Make every mile
                <span className="block text-teal-200">a safer one.</span>
              </h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
                See the road ahead through the forecast. Compare truck routes with
                weather, cargo weight, and arrival-time conditions in mind.
              </p>

              <div className="mt-9 grid max-w-md grid-cols-3 divide-x divide-white/15 border-y border-white/15 py-4">
                {highlights.map(({ value, label }) => (
                  <div key={label} className="px-3 first:pl-0 last:pr-0">
                    <p className="text-lg font-semibold text-white">{value}</p>
                    <p className="mt-1 text-[11px] leading-4 text-slate-400">{label}</p>
                  </div>
                ))}
              </div>

              <p className="mt-5 text-xs leading-5 text-slate-400">
                Planning with conditions in mind helps drivers make more informed decisions.
              </p>
            </section>

            <TripForm />
          </div>
        </div>
      </div>
      <footer className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-7 lg:px-10">
        <span>Roadwise · Weather-aware truck routing</span>
        <span>Built to help drivers plan with more context.</span>
      </footer>
    </main>
  )
}
