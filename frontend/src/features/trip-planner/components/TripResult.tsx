import { StatusBanner } from '../../../shared/components/StatusBanner'
import { RouteOptionCard } from './RouteOptionCard'
import type { TripPlanResponse } from '../types'

interface TripResultProps {
  plan: TripPlanResponse
  selectedRouteId: string
  onSelectRoute: (routeId: string) => void
}

export function TripResult({
  plan,
  selectedRouteId,
  onSelectRoute,
}: TripResultProps) {
  const hasSafeRoute = plan.recommendation.status === 'recommended'

  return (
    <section aria-labelledby="route-results-title" className="min-w-0 space-y-4">
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
            Compare routes
          </h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Select a route to inspect its forecast on the map.
          </p>
        </div>
        <span className="shrink-0 text-xs font-medium text-slate-500">
          {plan.trip.checkpoint_interval_miles} mi sampling
        </span>
      </div>
      <div className="space-y-3">
        {plan.routes.map((route, index) => (
          <RouteOptionCard
            key={route.id}
            route={route}
            index={index}
            selected={route.id === selectedRouteId}
            onSelect={() => onSelectRoute(route.id)}
          />
        ))}
      </div>
    </section>
  )
}
