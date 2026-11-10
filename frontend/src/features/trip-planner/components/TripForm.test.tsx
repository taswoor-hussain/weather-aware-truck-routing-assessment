import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../shared/api/ApiError'
import type { PlaceSuggestion, RouteOption, TripPlanResponse, TripRequest } from '../types'
import { TripForm } from './TripForm'
import { TripResult } from './TripResult'

const { planTrip, searchPlaces } = vi.hoisted(() => ({
  planTrip: vi.fn(),
  searchPlaces: vi.fn(),
}))

vi.mock('../api/tripApi', () => ({
  planTrip,
  searchPlaces,
}))

vi.mock('./TripMap', () => ({
  TripMap: () => <div data-testid="trip-map" />,
}))

function makeRoute(index: number): RouteOption {
  return {
    id: `route-${index + 1}`,
    summary: {
      distance_miles: 900 + index * 10,
      travel_time_seconds: 36000 + index * 600,
      departure_at: '2026-11-11T14:30:00Z',
      arrival_at: `2026-11-12T00:${String(index * 10).padStart(2, '0')}:00Z`,
    },
    geometry: {
      type: 'LineString',
      coordinates: [
        [-87.6, 41.8],
        [-104.9, 39.7 + index * 0.1],
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
          wind_mph: 20,
          rain_in_per_hour: 0,
          snow_in_per_hour: 0,
        },
        hourly_forecast: Array.from({ length: 49 }, (_, hour) => ({
          hour,
          wind_mph: 20,
          rain_in_per_hour: 0,
          snow_in_per_hour: 0,
          risk_level: 'low' as const,
        })),
        risk_level: 'low',
        risk_miles: 450,
      },
      {
        id: `route-${index + 1}-checkpoint-2`,
        distance_miles: 900 + index * 10,
        latitude: 39.7 + index * 0.1,
        longitude: -104.9,
        eta: '2026-11-12T00:30:00Z',
        segment_miles: 450,
        weather: {
          wind_mph: 20,
          rain_in_per_hour: 0,
          snow_in_per_hour: 0,
        },
        hourly_forecast: Array.from({ length: 49 }, (_, hour) => ({
          hour,
          wind_mph: 20,
          rain_in_per_hour: 0,
          snow_in_per_hour: 0,
          risk_level: 'low' as const,
        })),
        risk_level: 'low',
        risk_miles: 450,
      },
    ],
    risk_summary: {
      no_travel_miles: 0,
      severe_miles: 0,
      high_miles: 0,
      average_risk: 0,
    },
    is_recommended: index === 0,
  }
}

function makePlan(request: TripRequest): TripPlanResponse {
  return {
    status: 'planned',
    trip: request,
    routes: [makeRoute(0), makeRoute(1), makeRoute(2)],
    recommendation: {
      route_id: 'route-1',
      status: 'recommended',
      message: 'This route has the lowest weather risk.',
    },
  }
}

function renderForm() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <TripFormWithResults />
    </QueryClientProvider>,
  )
}

function TripFormWithResults() {
  const [plan, setPlan] = useState<TripPlanResponse | null>(null)
  return (
    <>
      <TripForm onPlan={setPlan} />
      {plan && (
        <TripResult
          plan={plan}
          selectedRouteId={plan.recommendation.route_id ?? plan.routes[0].id}
          onSelectRoute={vi.fn()}
        />
      )}
    </>
  )
}

async function choosePlace(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.type(screen.getByLabelText(label), label === 'Origin' ? 'Chicago, IL' : 'Denver, CO')
  const placeLabel = label === 'Origin' ? 'Chicago, IL' : 'Denver, CO'
  await user.click(await screen.findByRole('option', { name: new RegExp(placeLabel) }))
}

describe('TripForm', () => {
  beforeEach(() => {
    planTrip.mockReset()
    searchPlaces.mockReset()
    searchPlaces.mockImplementation(async (query: string) => {
      const place: PlaceSuggestion = query.toLowerCase().includes('denver')
        ? { label: 'Denver, CO', latitude: 39.7392, longitude: -104.9903 }
        : { label: 'Chicago, IL', latitude: 41.8781, longitude: -87.6298 }
      return [place]
    })
  })

  it('shows local field validation without calling the API', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: /find truck routes/i }))

    expect(await screen.findByText('Enter an origin.')).toBeInTheDocument()
    expect(screen.getByText('Choose a departure date and time.')).toBeInTheDocument()
    expect(planTrip).not.toHaveBeenCalled()
  })

  it('submits the normalized request and shows a success summary', async () => {
    const user = userEvent.setup()
    planTrip.mockImplementation(async (request: TripRequest) => makePlan(request))
    renderForm()

    await choosePlace(user, 'Origin')
    await choosePlace(user, 'Destination')
    fireEvent.change(screen.getByLabelText('Departure date & time'), {
      target: { value: '2026-11-11T08:30' },
    })
    await user.click(screen.getByRole('button', { name: /find truck routes/i }))

    expect(await screen.findByText('Safest available route selected')).toBeInTheDocument()
    expect(screen.getByText('Compare routes')).toBeInTheDocument()
    expect(screen.getByText('900 mi')).toBeInTheDocument()
    expect(screen.getAllByText('Checkpoint weather (2)')).toHaveLength(3)
    expect(planTrip.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        origin: 'Chicago, IL',
        destination: 'Denver, CO',
        load_weight_lb: 32000,
        checkpoint_interval_miles: 25,
      }),
    )
  })

  it('maps server validation errors back to the matching field', async () => {
    const user = userEvent.setup()
    planTrip.mockRejectedValue(
      new ApiError('Please review the highlighted information.', 400, {
        destination: 'Origin and destination must be different.',
      }),
    )
    renderForm()

    await user.type(screen.getByLabelText('Origin'), 'Chicago, IL')
    await user.click(await screen.findByRole('option', { name: /Chicago, IL/ }))
    await user.type(screen.getByLabelText('Destination'), 'Chicago, IL')
    await user.click(await screen.findByRole('option', { name: /Chicago, IL/ }))
    fireEvent.change(screen.getByLabelText('Departure date & time'), {
      target: { value: '2026-11-11T08:30' },
    })
    await user.click(screen.getByRole('button', { name: /find truck routes/i }))

    expect(
      await screen.findByText('Origin and destination must be different.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Destination')).toHaveAttribute('aria-invalid', 'true')
  })

  it('keeps the loading state visible while route planning is pending', async () => {
    const user = userEvent.setup()
    let resolveRequest: ((value: TripPlanResponse) => void) | undefined
    planTrip.mockImplementation(
      () =>
        new Promise<TripPlanResponse>((resolve) => {
          resolveRequest = resolve
        }),
    )
    renderForm()

    await choosePlace(user, 'Origin')
    await choosePlace(user, 'Destination')
    fireEvent.change(screen.getByLabelText('Departure date & time'), {
      target: { value: '2026-11-11T08:30' },
    })
    await user.click(screen.getByRole('button', { name: /find truck routes/i }))

    expect(await screen.findByRole('button', { name: /finding routes/i })).toBeDisabled()
    expect(screen.getByLabelText('Origin')).toBeDisabled()
    resolveRequest?.({
      status: 'planned',
      trip: {
        origin: 'Chicago, IL',
        destination: 'Denver, CO',
        departure_at: new Date('2026-11-11T08:30').toISOString(),
        load_weight_lb: 32000,
        checkpoint_interval_miles: 25,
      },
      routes: [makeRoute(0), makeRoute(1), makeRoute(2)],
      recommendation: {
        route_id: 'route-1',
        status: 'recommended',
        message: 'This route has the lowest weather risk.',
      },
    })
    await waitFor(() =>
      expect(screen.getByText('Safest available route selected')).toBeInTheDocument(),
    )
  })

  it('shows a recoverable message when the server cannot be reached', async () => {
    const user = userEvent.setup()
    planTrip.mockRejectedValue(
      new ApiError('Unable to reach the server. Check your connection and try again.'),
    )
    renderForm()

    await choosePlace(user, 'Origin')
    await choosePlace(user, 'Destination')
    fireEvent.change(screen.getByLabelText('Departure date & time'), {
      target: { value: '2026-11-11T08:30' },
    })
    await user.click(screen.getByRole('button', { name: /find truck routes/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Check your connection and try again.',
    )
  })
})
