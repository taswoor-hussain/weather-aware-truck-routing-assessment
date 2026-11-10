export const CHECKPOINT_INTERVALS = [10, 25, 50] as const

export type CheckpointInterval = (typeof CHECKPOINT_INTERVALS)[number]

export interface TripRequest {
  origin: string
  destination: string
  departure_at: string
  load_weight_lb: number
  checkpoint_interval_miles: CheckpointInterval
}

export interface RouteSummary {
  distance_miles: number
  travel_time_seconds: number
  departure_at: string
  arrival_at: string
}

export interface RouteOption {
  id: string
  summary: RouteSummary
  geometry: {
    type: 'LineString'
    coordinates: [number, number][]
  }
}

export interface TripPlanResponse {
  status: 'planned'
  trip: TripRequest
  routes: RouteOption[]
}
