import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { RouteOption, TripPlanResponse } from '../types'
import { TripResult } from './TripResult'

function routeOption(index: number): RouteOption {
  return {
    id: `route-${index + 1}`,
    summary: {
      distance_miles: 900,
      travel_time_seconds: 36000,
      departure_at: '2026-11-11T14:30:00Z',
      arrival_at: '2026-11-12T00:30:00Z',
    },
    geometry: {
      type: 'LineString',
      coordinates: [
        [-87.6, 41.8],
        [-104.9, 39.7],
      ],
    },
    checkpoints: [
      {
        id: `route-${index + 1}-checkpoint-1`,
        distance_miles: 0,
        latitude: 41.8,
        longitude: -87.6,
        eta: '2026-11-11T14:30:00Z',
        segment_miles: 900,
        weather: {
          wind_mph: 55,
          rain_in_per_hour: 0,
          snow_in_per_hour: 0,
        },
        risk_level: 'no_travel',
        risk_miles: 900,
      },
    ],
    risk_summary: {
      no_travel_miles: 900,
      severe_miles: 0,
      high_miles: 0,
      average_risk: 4,
    },
    is_recommended: false,
  }
}

const noSafeRoutePlan: TripPlanResponse = {
  status: 'planned',
  trip: {
    origin: 'Chicago, IL',
    destination: 'Denver, CO',
    departure_at: '2026-11-11T14:30:00Z',
    load_weight_lb: 32000,
    checkpoint_interval_miles: 25,
  },
  routes: [routeOption(0), routeOption(1), routeOption(2)],
  recommendation: {
    route_id: null,
    status: 'no_safe_route',
    message: 'All route options include No Travel weather. Do not depart.',
  },
}

describe('TripResult', () => {
  it('clearly warns when every route has No Travel weather', () => {
    render(<TripResult plan={noSafeRoutePlan} />)

    expect(screen.getByRole('alert')).toHaveTextContent('No safe route in forecast')
    expect(screen.getByRole('alert')).toHaveTextContent('Do not depart.')
    expect(screen.queryByText('Recommended')).not.toBeInTheDocument()
    expect(screen.getAllByText('No travel')).toHaveLength(3)
  })
})
