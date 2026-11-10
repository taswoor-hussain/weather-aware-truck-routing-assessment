import { StatusBanner } from '../../../shared/components/StatusBanner'
import { RouteOptionCard } from './RouteOptionCard'
import type { TripPlanResponse } from '../types'

interface TripResultProps {
  plan: TripPlanResponse
}

export function TripResult({ plan }: TripResultProps) {
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
      <div className="grid gap-3 md:grid-cols-3">
        {plan.routes.map((route, index) => (
          <RouteOptionCard key={route.id} route={route} index={index} />
        ))}
      </div>
      <StatusBanner variant="info" title="Map and forecast heatmap are next">
        Route geometry and checkpoint forecasts are ready for map visualization.
      </StatusBanner>
    </section>
  )
}
