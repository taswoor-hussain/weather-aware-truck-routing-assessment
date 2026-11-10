import { StatusBanner } from '../../../shared/components/StatusBanner'
import type { TripRequest } from '../types'

interface TripResultProps {
  trip: TripRequest
}

export function TripResult({ trip }: TripResultProps) {
  return (
    <StatusBanner variant="success" title="Trip details verified">
      <p>
        {trip.origin} to {trip.destination} · {trip.load_weight_lb.toLocaleString()} lb
      </p>
      <p>
        Departs {new Date(trip.departure_at).toLocaleString()} · weather every{' '}
        {trip.checkpoint_interval_miles} miles
      </p>
    </StatusBanner>
  )
}
