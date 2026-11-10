import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../shared/api/ApiError'
import type { TripRequest } from '../types'
import { TripForm } from './TripForm'

const validateTrip = vi.hoisted(() => vi.fn())

vi.mock('../api/tripApi', () => ({
  validateTrip,
}))

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
    validateTrip.mockReset()
  })

  it('shows local field validation without calling the API', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: /validate trip/i }))

    expect(await screen.findByText('Enter an origin.')).toBeInTheDocument()
    expect(screen.getByText('Choose a departure date and time.')).toBeInTheDocument()
    expect(validateTrip).not.toHaveBeenCalled()
  })

  it('submits the normalized request and shows a success summary', async () => {
    const user = userEvent.setup()
    validateTrip.mockImplementation(async (request: TripRequest) => ({
      status: 'validated',
      trip: request,
    }))
    renderForm()

    await user.type(screen.getByLabelText('Origin'), 'Chicago, IL')
    await user.type(screen.getByLabelText('Destination'), 'Denver, CO')
    fireEvent.change(screen.getByLabelText('Departure date & time'), {
      target: { value: '2026-11-11T08:30' },
    })
    await user.click(screen.getByRole('button', { name: /validate trip/i }))

    expect(await screen.findByText('Trip details verified')).toBeInTheDocument()
    expect(validateTrip.mock.calls[0][0]).toEqual(
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
    validateTrip.mockRejectedValue(
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
    await user.click(screen.getByRole('button', { name: /validate trip/i }))

    expect(
      await screen.findByText('Origin and destination must be different.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Destination')).toHaveAttribute('aria-invalid', 'true')
  })

  it('keeps the loading state visible while validation is pending', async () => {
    const user = userEvent.setup()
    let resolveRequest: ((value: { status: string; trip: TripRequest }) => void) | undefined
    validateTrip.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve
        }),
    )
    renderForm()

    await user.type(screen.getByLabelText('Origin'), 'Chicago, IL')
    await user.type(screen.getByLabelText('Destination'), 'Denver, CO')
    fireEvent.change(screen.getByLabelText('Departure date & time'), {
      target: { value: '2026-11-11T08:30' },
    })
    await user.click(screen.getByRole('button', { name: /validate trip/i }))

    expect(await screen.findByRole('button', { name: /checking trip/i })).toBeDisabled()
    expect(screen.getByLabelText('Origin')).toBeDisabled()
    resolveRequest?.({
      status: 'validated',
      trip: {
        origin: 'Chicago, IL',
        destination: 'Denver, CO',
        departure_at: new Date('2026-11-11T08:30').toISOString(),
        load_weight_lb: 32000,
        checkpoint_interval_miles: 25,
      },
    })
    await waitFor(() => expect(screen.getByText('Trip details verified')).toBeInTheDocument())
  })

  it('shows a recoverable message when the server cannot be reached', async () => {
    const user = userEvent.setup()
    validateTrip.mockRejectedValue(
      new ApiError('Unable to reach the server. Check your connection and try again.'),
    )
    renderForm()

    await user.type(screen.getByLabelText('Origin'), 'Chicago, IL')
    await user.type(screen.getByLabelText('Destination'), 'Denver, CO')
    fireEvent.change(screen.getByLabelText('Departure date & time'), {
      target: { value: '2026-11-11T08:30' },
    })
    await user.click(screen.getByRole('button', { name: /validate trip/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Check your connection and try again.',
    )
  })
})
