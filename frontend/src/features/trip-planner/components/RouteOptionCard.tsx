import { formatArrival, formatDuration } from '../utils/formatRoute'
import { RiskBadge } from './RiskBadge'
import type { RouteOption } from '../types'

interface RouteOptionCardProps {
  route: RouteOption
  index: number
}

export function RouteOptionCard({ route, index }: RouteOptionCardProps) {
  const isRecommended = route.is_recommended
  return (
    <article
      className={`rounded-2xl border bg-white p-4 shadow-sm ${
        isRecommended ? 'border-teal-300 ring-2 ring-teal-100' : 'border-slate-200'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-teal-800">
            Option {String(index + 1).padStart(2, '0')}
          </p>
          <h3 className="mt-1 text-base font-bold text-slate-900">
            {route.summary.distance_miles.toLocaleString()} mi
          </h3>
        </div>
        {isRecommended ? (
          <span className="rounded-lg bg-teal-100 px-2.5 py-1 text-xs font-bold text-teal-900">
            Recommended
          </span>
        ) : (
          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
            Alternative
          </span>
        )}
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
      <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
        <div>
          <dt className="text-[10px] font-medium text-slate-500">No travel</dt>
          <dd className="mt-1 text-sm font-bold text-slate-900">
            {route.risk_summary.no_travel_miles.toFixed(1)} mi
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-medium text-slate-500">Severe</dt>
          <dd className="mt-1 text-sm font-bold text-slate-900">
            {route.risk_summary.severe_miles.toFixed(1)} mi
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-medium text-slate-500">High</dt>
          <dd className="mt-1 text-sm font-bold text-slate-900">
            {route.risk_summary.high_miles.toFixed(1)} mi
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-slate-600">
        Average weather risk: {route.risk_summary.average_risk.toFixed(2)} / 4
      </p>
      <details className="mt-4 border-t border-slate-100 pt-3">
        <summary className="cursor-pointer text-sm font-semibold text-slate-800">
          Checkpoint weather ({route.checkpoints.length})
        </summary>
        <div className="mt-3 max-h-72 overflow-auto rounded-lg border border-slate-100">
          <table className="w-full min-w-[32rem] text-left text-xs">
            <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-3 py-2">Mile</th>
                <th scope="col" className="px-3 py-2">ETA</th>
                <th scope="col" className="px-3 py-2">Wind</th>
                <th scope="col" className="px-3 py-2">Rain</th>
                <th scope="col" className="px-3 py-2">Snow</th>
                <th scope="col" className="px-3 py-2">Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {route.checkpoints.map((checkpoint) => (
                <tr key={checkpoint.id} className="text-slate-700">
                  <td className="whitespace-nowrap px-3 py-2">
                    {checkpoint.distance_miles.toFixed(1)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {formatArrival(checkpoint.eta)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {checkpoint.weather.wind_mph.toFixed(1)} mph
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {checkpoint.weather.rain_in_per_hour.toFixed(2)} in/hr
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {checkpoint.weather.snow_in_per_hour.toFixed(2)} in/hr
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <RiskBadge level={checkpoint.risk_level} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </article>
  )
}
