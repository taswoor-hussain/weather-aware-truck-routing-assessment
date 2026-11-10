import { useState } from 'react'
import { PanelLeftClose, PanelLeftOpen, Route } from 'lucide-react'
import { TripMapPanel } from './TripMapPanel'
import { TripForm } from './TripForm'
import { TripResult } from './TripResult'
import type { TripPlanResponse } from '../types'

export function TripPlannerPage() {
  const [plan, setPlan] = useState<TripPlanResponse | null>(null)
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null)
  const [isTripPanelOpen, setIsTripPanelOpen] = useState(true)
  const [forecastHour, setForecastHour] = useState(0)
  const [isForecastPlaying, setIsForecastPlaying] = useState(false)

  function handlePlan(nextPlan: TripPlanResponse | null) {
    setPlan(nextPlan)
    setForecastHour(0)
    setIsForecastPlaying(false)
    setSelectedRouteId(
      nextPlan
        ? nextPlan.recommendation.route_id ?? nextPlan.routes[0]?.id ?? null
        : null,
    )
  }

  return (
    <main className="relative h-dvh min-h-0 overflow-hidden bg-slate-100">
      <TripMapPanel
        plan={plan}
        selectedRouteId={selectedRouteId}
        onSelectRoute={setSelectedRouteId}
        isTripPanelOpen={isTripPanelOpen}
        forecastHour={forecastHour}
        onForecastHourChange={setForecastHour}
        isPlaying={isForecastPlaying}
        onPlaybackChange={setIsForecastPlaying}
      />

      {isTripPanelOpen ? (
        <aside className={`absolute bottom-4 left-3 top-3 z-[1100] flex w-[min(25rem,calc(100vw-1.5rem))] flex-col gap-3 overflow-y-auto rounded-[1.75rem] border border-white/80 bg-white/90 p-3 shadow-[0_24px_70px_-30px_rgba(15,35,48,0.5)] backdrop-blur-xl sm:left-4 sm:top-4 sm:w-[min(25rem,calc(100vw-2rem))] sm:p-4 ${plan ? 'max-sm:bottom-52 sm:bottom-4' : ''}`}>
          <div className="flex items-center justify-between px-1 pt-0.5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-950 text-white shadow-sm">
                <Route aria-hidden="true" className="size-5" strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold tracking-tight text-slate-950">Trip planner</p>
                <p className="mt-0.5 text-xs text-slate-500">Weather-aware truck routing</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsTripPanelOpen(false)}
              className="grid size-10 shrink-0 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
              aria-label="Hide trip planner panel"
              title="Hide trip planner"
            >
              <PanelLeftClose aria-hidden="true" className="size-5" />
            </button>
          </div>
          <TripForm onPlan={handlePlan} />
          {plan && (
            <TripResult
              plan={plan}
              selectedRouteId={selectedRouteId ?? plan.routes[0].id}
              onSelectRoute={setSelectedRouteId}
            />
          )}
          <p className="px-3 pb-2 text-xs leading-5 text-slate-500">
            Routes and forecasts are estimates. Follow posted restrictions.
          </p>
        </aside>
      ) : (
        <button
          type="button"
          onClick={() => setIsTripPanelOpen(true)}
          className="absolute left-3 top-3 z-[1100] inline-flex min-h-11 items-center gap-2.5 rounded-xl border border-white/80 bg-white/95 px-4 text-sm font-semibold text-slate-900 shadow-lg backdrop-blur transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 sm:left-4 sm:top-4"
        >
          <PanelLeftOpen aria-hidden="true" className="size-4" />
          Trip planner
        </button>
      )}
    </main>
  )
}
