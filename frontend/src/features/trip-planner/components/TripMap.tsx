import { divIcon, latLngBounds } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Fragment, useEffect, useMemo } from 'react'
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  Tooltip,
  ZoomControl,
  useMap,
} from 'react-leaflet'
import { formatArrival } from '../utils/formatRoute'
import { RISK_PRESENTATION } from '../utils/riskPresentation'
import type { RouteOption } from '../types'

interface TripMapProps {
  routes: RouteOption[]
  selectedRouteId: string | null
  forecastHour: number
  isPlaying: boolean
  onSelectRoute: (routeId: string) => void
}

const routeColors = ['#0f766e', '#2563eb', '#9333ea']

function FitRouteBounds({ routes }: Pick<TripMapProps, 'routes'>) {
  const map = useMap()

  useEffect(() => {
    if (routes.length === 0) return
    const bounds = latLngBounds(
      routes.flatMap((route) =>
        route.geometry.coordinates.map(([longitude, latitude]) => [
          latitude,
          longitude,
        ] as [number, number]),
      ),
    )
    if (!bounds.isValid()) return

    const fitRoutes = () => {
      const { x: width } = map.getSize()
      const isSmallScreen = width < 768
      const leftPadding = isSmallScreen
        ? 24
        : Math.min(460, Math.max(420, Math.round(width * 0.34)))
      map.fitBounds(bounds, {
        paddingTopLeft: [leftPadding, 84],
        paddingBottomRight: [24, isSmallScreen ? 220 : 170],
        maxZoom: 8,
      })
    }

    fitRoutes()
    map.on('resize', fitRoutes)
    return () => {
      map.off('resize', fitRoutes)
    }
  }, [map, routes])

  return null
}

const startIcon = divIcon({
  className: '',
  html: '<span style="display:grid;place-items:center;width:30px;height:30px;border:3px solid white;border-radius:50%;background:#0f766e;color:white;font:700 12px sans-serif;box-shadow:0 2px 8px #0f172a55">A</span>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
})

const endIcon = divIcon({
  className: '',
  html: '<span style="display:grid;place-items:center;width:30px;height:30px;border:3px solid white;border-radius:50%;background:#172554;color:white;font:700 12px sans-serif;box-shadow:0 2px 8px #0f172a55">B</span>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
})

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
  isPlaying,
  onSelectRoute,
}: TripMapProps) {
  const selectedRoute = routes.find((route) => route.id === selectedRouteId) ?? routes[0]
  const routeLines = useMemo(() => routes.map(routePositions), [routes])
  const firstPosition = routeLines[0]?.[0] ?? [39.5, -98.35]
  const selectedLine = selectedRoute ? routeLines[routes.indexOf(selectedRoute)] : undefined
  const lastPosition = selectedLine?.[selectedLine.length - 1]

  return (
    <section aria-label="Trip route map" className="absolute inset-0">
      <div className="absolute inset-0">
        <MapContainer
          center={firstPosition}
          zoom={4}
          className="h-full w-full bg-slate-100"
          aria-label="Map showing all route options and forecast risk checkpoints"
          scrollWheelZoom
          touchZoom
          doubleClickZoom
          keyboard
          zoomControl={false}
        >
          <FitRouteBounds routes={routes} />
          <ZoomControl position="topright" />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {routes.map((route, index) => {
            const isSelected = route.id === selectedRoute?.id
            return (
              <Fragment key={route.id}>
                {isSelected && (
                  <Polyline
                    positions={routeLines[index]}
                    pathOptions={{
                      color: '#ffffff',
                      weight: 10,
                      opacity: 0.9,
                      lineCap: 'round',
                      lineJoin: 'round',
                      interactive: false,
                    }}
                  />
                )}
                <Polyline
                  positions={routeLines[index]}
                  pathOptions={{
                    color: routeColors[index % routeColors.length],
                    weight: isSelected ? 6 : 3,
                    opacity: isSelected ? 0.98 : 0.48,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                  eventHandlers={{ click: () => onSelectRoute(route.id) }}
                />
                {isSelected && isPlaying && (
                  <Polyline
                    positions={routeLines[index]}
                    pathOptions={{
                      color: '#a7f3b7',
                      weight: 5,
                      opacity: 1,
                      dashArray: '1 22',
                      lineCap: 'round',
                      className: 'route-flow',
                      interactive: false,
                    }}
                  />
                )}
              </Fragment>
            )
          })}
          {routes.map((route, routeIndex) =>
            route.checkpoints.map((checkpoint) => {
              const sample = checkpoint.hourly_forecast[forecastHour] ?? checkpoint.hourly_forecast[0]
              const isSelected = route.id === selectedRoute?.id

              return (
                <Fragment key={checkpoint.id}>
                  {isSelected && (
                    <CircleMarker
                      key={`${checkpoint.id}-glow`}
                      center={[checkpoint.latitude, checkpoint.longitude]}
                      radius={18}
                      pathOptions={{
                        stroke: false,
                        fillColor: RISK_PRESENTATION[sample.risk_level].color,
                        fillOpacity: 0.16,
                        interactive: false,
                      }}
                    />
                  )}
                  <CircleMarker
                    key={checkpoint.id}
                    center={[checkpoint.latitude, checkpoint.longitude]}
                    radius={isSelected ? 7 : 5}
                    pathOptions={{
                      color: '#ffffff',
                      weight: 2,
                      fillColor: RISK_PRESENTATION[sample.risk_level].color,
                      fillOpacity: isSelected ? 0.98 : 0.65,
                    }}
                  >
                    <Tooltip direction="top" offset={[0, -6]}>{`Route ${routeIndex + 1} · Mile ${checkpoint.distance_miles.toFixed(0)}`}</Tooltip>
                    <Popup>
                      <div className="space-y-1 text-xs">
                        <p className="font-bold text-slate-900">
                          Route {routeIndex + 1} · Mile {checkpoint.distance_miles.toFixed(1)} · {RISK_PRESENTATION[sample.risk_level].label} risk
                        </p>
                        <p>Forecast: +{forecastHour}h · {formatArrival(sampleTime(route, forecastHour))}</p>
                        <p>Truck ETA: {formatArrival(checkpoint.eta)}</p>
                        <p>Wind: {sample.wind_mph.toFixed(1)} mph</p>
                        <p>Rain: {sample.rain_in_per_hour.toFixed(2)} in/hr</p>
                        <p>Snow: {sample.snow_in_per_hour.toFixed(2)} in/hr</p>
                      </div>
                    </Popup>
                  </CircleMarker>
                </Fragment>
              )
            }),
          )}
          {selectedRoute && selectedLine && lastPosition && (
            <>
              <Marker position={selectedLine[0]} icon={startIcon}>
                <Tooltip direction="top">Origin</Tooltip>
              </Marker>
              <Marker position={lastPosition} icon={endIcon}>
                <Tooltip direction="top">Destination</Tooltip>
              </Marker>
            </>
          )}
        </MapContainer>
        {routes.length === 0 && (
          <div className="pointer-events-none absolute inset-x-4 bottom-5 z-[500] flex justify-center">
            <div className="rounded-2xl border border-white/80 bg-white/95 px-5 py-3 text-center shadow-lg backdrop-blur">
              <p className="text-sm font-bold text-slate-900">Your route map starts here</p>
              <p className="mt-1 text-xs text-slate-600">Add your origin and destination to compare truck routes.</p>
            </div>
          </div>
        )}
        {isPlaying && selectedRoute && (
          <div
            className="pointer-events-none absolute left-4 top-4 z-[500] inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-white/95 px-3 py-2 text-xs font-semibold text-emerald-950 shadow-lg backdrop-blur"
            role="status"
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-600" />
            </span>
            Route light active · Route {routes.indexOf(selectedRoute) + 1}
          </div>
        )}
      </div>
    </section>
  )
}

function sampleTime(route: RouteOption, hour: number): string {
  return new Date(
    new Date(route.summary.departure_at).getTime() + hour * 60 * 60 * 1000,
  ).toISOString()
}
