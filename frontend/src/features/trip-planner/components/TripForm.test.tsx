import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../shared/api/ApiError'
import type { RouteOption, TripPlanResponse, TripRequest } from '../types'
import { TripForm } from './TripForm'

const planTrip = vi.hoisted(() => vi.fn())

vi.mock('../api/tripApi', () => ({
  planTrip,
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
  }
}

function makePlan(request: TripRequest): TripPlanResponse {
  return {
    status: 'planned',
    trip: request,
    routes: [makeRoute(0), makeRoute(1), makeRoute(2)],
  }
}

function renderForm() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <TripForm />
    </QueryClientProvider>,
  )
}

describe('TripForm', () => {
  beforeEach(() => {
    planTrip.mockReset()
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

    await user.type(screen.getByLabelText('Origin'), 'Chicago, IL')
    await user.type(screen.getByLabelText('Destination'), 'Denver, CO')
    fireEvent.change(screen.getByLabelText('Departure date & time'), {
      target: { value: '2026-11-11T08:30' },
    })
    await user.click(screen.getByRole('button', { name: /find truck routes/i }))

    expect(await screen.findByText('Three truck routes found')).toBeInTheDocument()
    expect(screen.getByText('Compare route options')).toBeInTheDocument()
    expect(screen.getByText('900 mi')).toBeInTheDocument()
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
    await user.type(screen.getByLabelText('Destination'), 'Chicago, IL')
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

    await user.type(screen.getByLabelText('Origin'), 'Chicago, IL')
    await user.type(screen.getByLabelText('Destination'), 'Denver, CO')
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
    })
    await waitFor(() => expect(screen.getByText('Three truck routes found')).toBeInTheDocument())
  })

  it('shows a recoverable message when the server cannot be reached', async () => {
    const user = userEvent.setup()
    planTrip.mockRejectedValue(
      new ApiError('Unable to reach the server. Check your connection and try again.'),
    )
    renderForm()

    await user.type(screen.getByLabelText('Origin'), 'Chicago, IL')
    await user.type(screen.getByLabelText('Destination'), 'Denver, CO')
    fireEvent.change(screen.getByLabelText('Departure date & time'), {
      target: { value: '2026-11-11T08:30' },
    })
    await user.click(screen.getByRole('button', { name: /find truck routes/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Check your connection and try again.',
    )
  })
})
