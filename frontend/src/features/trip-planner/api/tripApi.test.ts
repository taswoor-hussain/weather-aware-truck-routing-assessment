import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../../../shared/api/apiClient'
import { planTrip } from './tripApi'

vi.mock('../../../shared/api/apiClient', () => ({
  apiClient: {
    post: vi.fn(),
  },
}))

describe('planTrip', () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset()
  })

  it('accepts a complete plan response with three GeoJSON routes', async () => {
    const request = {
      origin: 'Chicago, IL',
      destination: 'Denver, CO',
      departure_at: '2026-11-11T14:30:00Z',
      load_weight_lb: 32000,
      checkpoint_interval_miles: 25 as const,
    }
    const route = (id: string, offset: number) => ({
      id,
      summary: {
        distance_miles: 900 + offset,
        travel_time_seconds: 36000 + offset,
        departure_at: request.departure_at,
        arrival_at: '2026-11-12T00:30:00Z',
      },
      geometry: {
        type: 'LineString' as const,
        coordinates: [
          [-87.6, 41.8] as [number, number],
          [-104.9, 39.7 + offset * 0.01] as [number, number],
        ],
      },
    })
    const responseData = {
      status: 'planned',
      trip: request,
      routes: [route('route-1', 0), route('route-2', 1), route('route-3', 2)],
    }
    vi.mocked(apiClient.post).mockResolvedValue({ data: responseData })

    await expect(planTrip(request)).resolves.toEqual(responseData)
  })

  it('rejects a successful response that does not match the API contract', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { status: 'ok' } })

    await expect(
      planTrip({
        origin: 'Chicago, IL',
        destination: 'Denver, CO',
        departure_at: '2026-11-11T14:30:00Z',
        load_weight_lb: 32000,
        checkpoint_interval_miles: 25,
      }),
    ).rejects.toMatchObject({
      name: 'ApiError',
      message: 'The server returned an invalid trip response.',
    })
  })

  it('converts server field errors to a typed API error', async () => {
    vi.mocked(apiClient.post).mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 400,
        data: { destination: ['Origin and destination must be different.'] },
      },
    })

    await expect(
      planTrip({
        origin: 'Chicago, IL',
        destination: 'Chicago, IL',
        departure_at: '2026-11-11T14:30:00Z',
        load_weight_lb: 32000,
        checkpoint_interval_miles: 25,
      }),
    ).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      fieldErrors: {
        destination: 'Origin and destination must be different.',
      },
    })
  })
})
