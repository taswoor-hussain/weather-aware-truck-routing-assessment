import { formatArrival, formatDuration } from '../utils/formatRoute'
import type { RouteOption } from '../types'

interface RouteOptionCardProps {
  route: RouteOption
  index: number
}

export function RouteOptionCard({ route, index }: RouteOptionCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-teal-800">
            Option {String(index + 1).padStart(2, '0')}
          </p>
          <h3 className="mt-1 text-base font-bold text-slate-900">
            {route.summary.distance_miles.toLocaleString()} mi
          </h3>
        </div>
        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
          Truck route
        </span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
        <div>
          <dt className="text-[11px] font-medium text-slate-500">Est. drive time</dt>
          <dd className="mt-1 text-sm font-semibold text-slate-800">
            {formatDuration(route.summary.travel_time_seconds)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium text-slate-500">Est. arrival</dt>
          <dd className="mt-1 text-sm font-semibold text-slate-800">
            {formatArrival(route.summary.arrival_at)}
          </dd>
        </div>
      </dl>
    </article>
  )
}
