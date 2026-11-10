export const CHECKPOINT_INTERVALS = [10, 25, 50] as const

export type CheckpointInterval = (typeof CHECKPOINT_INTERVALS)[number]

export interface TripRequest {
  origin: string
  destination: string
  departure_at: string
  load_weight_lb: number
  checkpoint_interval_miles: CheckpointInterval
}

export interface TripValidationResponse {
  status: 'validated'
  trip: TripRequest
}
