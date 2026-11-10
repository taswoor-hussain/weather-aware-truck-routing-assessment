import { lazy, Suspense, useState } from 'react'
import { StatusBanner } from '../../../shared/components/StatusBanner'
import { RouteOptionCard } from './RouteOptionCard'
import type { TripPlanResponse } from '../types'
import { ForecastSlider } from './ForecastSlider'

const TripMap = lazy(() =>
  import('./TripMap').then((module) => ({ default: module.TripMap })),
)

interface TripResultProps {
  plan: TripPlanResponse
}

export function TripResult({ plan }: TripResultProps) {
  const [selectedRouteId, setSelectedRouteId] = useState(
    plan.recommendation.route_id ?? plan.routes[0].id,
  )
  const [forecastHour, setForecastHour] = useState(0)
  const hasSafeRoute = plan.recommendation.status === 'recommended'

  return (
    <section aria-labelledby="route-results-title" className="space-y-4">
      <StatusBanner
        variant={hasSafeRoute ? 'success' : 'error'}
        title={hasSafeRoute ? 'Safest available route selected' : 'No safe route in forecast'}
      >
        {plan.recommendation.message} {plan.trip.origin} to {plan.trip.destination} ·{' '}
        {plan.trip.load_weight_lb.toLocaleString()} lb
      </StatusBanner>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h3 id="route-results-title" className="text-base font-bold text-slate-950">
            Weather-ranked route options
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Checkpoint conditions are sampled at each estimated arrival time.
          </p>
        </div>
        <span className="shrink-0 text-xs font-medium text-slate-500">
          {plan.trip.checkpoint_interval_miles} mi sampling
        </span>
      </div>
      <div className="space-y-3">
        <ForecastSlider
          departureAt={plan.trip.departure_at}
          hour={forecastHour}
          onChange={setForecastHour}
        />
        <Suspense
          fallback={
            <div
              className="grid h-[24rem] place-items-center rounded-2xl border border-slate-200 bg-slate-100 text-sm font-medium text-slate-600 sm:h-[32rem]"
              role="status"
            >
              Loading route map…
            </div>
          }
        >
          <TripMap
            routes={plan.routes}
            selectedRouteId={selectedRouteId}
            forecastHour={forecastHour}
            onSelectRoute={setSelectedRouteId}
          />
        </Suspense>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {plan.routes.map((route, index) => (
          <RouteOptionCard key={route.id} route={route} index={index} />
        ))}
      </div>
    </section>
  )
}
