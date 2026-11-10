import { latLngBounds } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo } from 'react'
import {
  CircleMarker,
  MapContainer,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet'
import { formatArrival } from '../utils/formatRoute'
import type { RiskLevel, RouteOption } from '../types'

interface TripMapProps {
  routes: RouteOption[]
  selectedRouteId: string
  forecastHour: number
  onSelectRoute: (routeId: string) => void
}

const routeColors = ['#0f766e', '#2563eb', '#9333ea']

const riskColors: Record<RiskLevel, string> = {
  low: '#10b981',
  moderate: '#f59e0b',
  high: '#f97316',
  severe: '#e11d48',
  no_travel: '#111827',
}

const riskLabels: Record<RiskLevel, string> = {
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
  severe: 'Severe',
  no_travel: 'No Travel',
}

function FitRouteBounds({ routes }: Pick<TripMapProps, 'routes'>) {
  const map = useMap()

  useEffect(() => {
    const bounds = latLngBounds(
      routes.flatMap((route) =>
        route.geometry.coordinates.map(([longitude, latitude]) => [
          latitude,
          longitude,
        ] as [number, number]),
      ),
    )
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [28, 28], maxZoom: 8 })
    }
  }, [map, routes])

  return null
}

function routePositions(route: RouteOption): [number, number][] {
  return route.geometry.coordinates.map(([longitude, latitude]) => [
    latitude,
    longitude,
  ])
}

export function TripMap({
  routes,
  selectedRouteId,
  forecastHour,
  onSelectRoute,
}: TripMapProps) {
  const selectedRoute = routes.find((route) => route.id === selectedRouteId) ?? routes[0]
  const routeLines = useMemo(() => routes.map(routePositions), [routes])
  const firstPosition = routeLines[0][0]

  return (
    <section aria-labelledby="trip-map-title" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 p-4 sm:p-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-teal-800">
            Route visualization
          </p>
          <h3 id="trip-map-title" className="mt-1 text-lg font-bold text-slate-950">
            Weather along the corridor
          </h3>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-600">
            Colored checkpoints show the selected route’s forecast risk at the chosen hour.
            Route lines remain visible for comparison.
          </p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Select route for forecast map">
          {routes.map((route, index) => {
            const isSelected = route.id === selectedRoute.id
            return (
              <button
                key={route.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onSelectRoute(route.id)}
                className={`rounded-lg border px-3 py-2 text-xs font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 ${
                  isSelected
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                }`}
              >
                <span
                  aria-hidden="true"
                  className="mr-1.5 inline-block size-2 rounded-full"
                  style={{ backgroundColor: routeColors[index % routeColors.length] }}
                />
                Route {index + 1}
              </button>
            )
          })}
        </div>
      </div>
      <div className="relative">
        <MapContainer
          center={firstPosition}
          zoom={5}
          scrollWheelZoom={false}
          className="h-[24rem] w-full bg-slate-100 sm:h-[32rem]"
          aria-label="Map showing all route options and forecast risk checkpoints"
        >
          <FitRouteBounds routes={routes} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {routes.map((route, index) => (
            <Polyline
              key={route.id}
              positions={routeLines[index]}
              pathOptions={{
                color: routeColors[index % routeColors.length],
                weight: route.id === selectedRoute.id ? 5 : 3,
                opacity: route.id === selectedRoute.id ? 0.9 : 0.55,
              }}
            />
          ))}
          {selectedRoute.checkpoints.map((checkpoint) => {
            const sample = checkpoint.hourly_forecast[forecastHour]
            const color = riskColors[sample.risk_level]

            return (
              <CircleMarker
                key={checkpoint.id}
                center={[checkpoint.latitude, checkpoint.longitude]}
                radius={7}
                pathOptions={{
                  color: '#ffffff',
                  weight: 2,
                  fillColor: color,
                  fillOpacity: 0.95,
                }}
              >
                <Popup>
                  <div className="space-y-1 text-xs">
                    <p className="font-bold text-slate-900">
                      Mile {checkpoint.distance_miles.toFixed(1)} · {riskLabels[sample.risk_level]} risk
                    </p>
                    <p>Forecast: +{forecastHour}h · {formatArrival(sampleTime(selectedRoute, forecastHour))}</p>
                    <p>Truck ETA: {formatArrival(checkpoint.eta)}</p>
                    <p>Wind: {sample.wind_mph.toFixed(1)} mph</p>
                    <p>Rain: {sample.rain_in_per_hour.toFixed(2)} in/hr</p>
                    <p>Snow: {sample.snow_in_per_hour.toFixed(2)} in/hr</p>
                  </div>
                </Popup>
              </CircleMarker>
            )
          })}
        </MapContainer>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 px-4 py-3 text-[11px] text-slate-600 sm:px-5">
        <span className="font-semibold text-slate-800">Checkpoint risk</span>
        {(Object.keys(riskLabels) as RiskLevel[]).map((level) => (
          <span key={level} className="inline-flex items-center gap-1.5">
            <i
              aria-hidden="true"
              className="size-2.5 rounded-full"
              style={{ backgroundColor: riskColors[level] }}
            />
            {riskLabels[level]}
          </span>
        ))}
        <span className="ml-auto">Map tiles © OpenStreetMap contributors</span>
      </div>
    </section>
  )
}

function sampleTime(route: RouteOption, hour: number): string {
  return new Date(
    new Date(route.summary.departure_at).getTime() + hour * 60 * 60 * 1000,
  ).toISOString()
}
