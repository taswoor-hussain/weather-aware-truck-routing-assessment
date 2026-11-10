import { useState } from 'react'
import { BrandHeader } from './BrandHeader'
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
        forecastHour={forecastHour}
        onForecastHourChange={setForecastHour}
        isPlaying={isForecastPlaying}
        onPlaybackChange={setIsForecastPlaying}
      />

      <div className="absolute left-3 top-3 z-[1200] w-fit rounded-2xl bg-slate-950/90 px-3 shadow-xl shadow-slate-950/20 backdrop-blur-md sm:left-4 sm:top-4">
        <BrandHeader />
      </div>

      {isTripPanelOpen ? (
        <aside className="absolute bottom-[13rem] left-3 top-[5.25rem] z-[1100] flex w-[min(25rem,calc(100vw-1.5rem))] flex-col gap-3 overflow-y-auto rounded-[1.75rem] border border-white/80 bg-slate-100/80 p-2.5 shadow-[0_24px_70px_-30px_rgba(15,35,48,0.5)] backdrop-blur-md sm:bottom-4 sm:left-4 sm:top-20 sm:w-[min(25rem,calc(100vw-2rem))] sm:p-3">
          <div className="flex items-center justify-between px-2 pt-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-600">
              Trip workspace
            </p>
            <button
              type="button"
              onClick={() => setIsTripPanelOpen(false)}
              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-white hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
              aria-label="Hide trip planner panel"
            >
              Hide panel
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
          className="absolute left-3 top-20 z-[1100] inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/80 bg-white/95 px-4 text-sm font-semibold text-slate-900 shadow-lg backdrop-blur transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 sm:left-4"
        >
          <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="size-4">
            <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          Trip planner
        </button>
      )}
    </main>
  )
}
