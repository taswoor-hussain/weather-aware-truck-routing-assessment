import { lazy, Suspense } from 'react'
import { ForecastSlider } from './ForecastSlider'
import type { TripPlanResponse } from '../types'

const TripMap = lazy(() =>
  import('./TripMap').then((module) => ({ default: module.TripMap })),
)

interface TripMapPanelProps {
  plan: TripPlanResponse | null
  selectedRouteId: string | null
  onSelectRoute: (routeId: string) => void
  forecastHour: number
  onForecastHourChange: (hour: number) => void
  isPlaying: boolean
  onPlaybackChange: (isPlaying: boolean) => void
}

export function TripMapPanel({
  plan,
  selectedRouteId,
  onSelectRoute,
  forecastHour,
  onForecastHourChange,
  isPlaying,
  onPlaybackChange,
}: TripMapPanelProps) {
  return (
    <section aria-label="Weather-aware route map" className="absolute inset-0">
      <Suspense
        fallback={
          <div
            className="absolute inset-0 grid place-items-center bg-slate-100 text-sm font-medium text-slate-600"
            role="status"
          >
            Loading interactive map…
          </div>
        }
      >
        <TripMap
          routes={plan?.routes ?? []}
          selectedRouteId={selectedRouteId}
          forecastHour={forecastHour}
          isPlaying={isPlaying}
          onSelectRoute={onSelectRoute}
        />
      </Suspense>

      <div className="pointer-events-none absolute right-3 top-[5.25rem] z-[1050] rounded-xl border border-white/80 bg-white/90 px-3 py-2 text-[11px] font-medium text-slate-600 shadow-md backdrop-blur sm:right-16 sm:top-4 sm:text-xs">
        <span className="hidden sm:inline">Scroll, pinch, or double-click to zoom · drag to pan</span>
        <span className="sm:hidden">Pinch to zoom · drag to pan</span>
      </div>

      {plan && (
        <div className="forecast-map-overlay absolute inset-x-3 z-[1050] sm:inset-x-5 lg:left-[27rem] lg:right-5">
          <div className="mx-auto max-w-3xl">
            <ForecastSlider
              departureAt={plan.trip.departure_at}
              hour={forecastHour}
              isPlaying={isPlaying}
              onChange={onForecastHourChange}
              onPlaybackChange={onPlaybackChange}
            />
          </div>
        </div>
      )}

    </section>
  )
}
