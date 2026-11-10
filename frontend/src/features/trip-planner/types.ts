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

export type RiskLevel = 'low' | 'moderate' | 'high' | 'severe' | 'no_travel'

export interface WeatherObservation {
  wind_mph: number
  rain_in_per_hour: number
  snow_in_per_hour: number
}

export interface RouteCheckpoint {
  id: string
  distance_miles: number
  latitude: number
  longitude: number
  eta: string
  segment_miles: number
  weather: WeatherObservation
  risk_level: RiskLevel
  risk_miles: number
}

export interface RouteRiskSummary {
  no_travel_miles: number
  severe_miles: number
  high_miles: number
  average_risk: number
}

export interface RouteOption {
  id: string
  summary: RouteSummary
  geometry: {
    type: 'LineString'
    coordinates: [number, number][]
  }
  checkpoints: RouteCheckpoint[]
  risk_summary: RouteRiskSummary
  is_recommended: boolean
}

export interface RouteRecommendation {
  route_id: string | null
  status: 'recommended' | 'no_safe_route'
  message: string
}

export interface TripPlanResponse {
  status: 'planned'
  trip: TripRequest
  routes: RouteOption[]
  recommendation: RouteRecommendation
}
