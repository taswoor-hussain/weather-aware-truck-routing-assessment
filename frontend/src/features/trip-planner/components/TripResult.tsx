import { StatusBanner } from '../../../shared/components/StatusBanner'
import { RouteOptionCard } from './RouteOptionCard'
import type { TripPlanResponse } from '../types'

interface TripResultProps {
  plan: TripPlanResponse
}

export function TripResult({ plan }: TripResultProps) {
  return (
    <section aria-labelledby="route-results-title" className="space-y-4">
      <StatusBanner variant="success" title="Three truck routes found">
        {plan.trip.origin} to {plan.trip.destination} ·{' '}
        {plan.trip.load_weight_lb.toLocaleString()} lb
      </StatusBanner>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h3 id="route-results-title" className="text-base font-bold text-slate-950">
            Compare route options
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Times include routing estimates for the selected departure.
          </p>
        </div>
        <span className="shrink-0 text-xs font-medium text-slate-500">
          {plan.trip.checkpoint_interval_miles} mi sampling
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {plan.routes.map((route, index) => (
          <RouteOptionCard key={route.id} route={route} index={index} />
        ))}
      </div>
      <StatusBanner variant="info" title="Weather scoring is next">
        Route risk and checkpoint forecasts will be added in the next planning stage.
      </StatusBanner>
    </section>
  )
}
