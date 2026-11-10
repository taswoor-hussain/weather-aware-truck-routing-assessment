import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../../../shared/api/apiClient'
import { planTrip, searchPlaces } from './tripApi'

vi.mock('../../../shared/api/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

describe('searchPlaces', () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset()
  })

  it('sends the query and abort signal and validates the suggestion response', async () => {
    const signal = new AbortController().signal
    const places = [
      { label: 'Chicago, IL', latitude: 41.8781, longitude: -87.6298 },
    ]
    vi.mocked(apiClient.get).mockResolvedValue({ data: { places } })

    await expect(searchPlaces('Chicago', signal)).resolves.toEqual(places)
    expect(apiClient.get).toHaveBeenCalledWith('/places/suggest/', {
      params: { q: 'Chicago' },
      signal,
    })
  })

  it('rejects malformed suggestion data with a safe API error', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { places: [{ label: 'Bad coordinates', latitude: 91, longitude: 0 }] },
    })

    await expect(searchPlaces('Chicago')).rejects.toMatchObject({
      name: 'ApiError',
      message: 'The server returned invalid place suggestions.',
    })
  })
})

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
      checkpoints: [
        {
          id: `${id}-checkpoint-1`,
          distance_miles: 0,
          latitude: 41.8,
          longitude: -87.6,
          eta: request.departure_at,
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
            risk_level: 'low',
          })),
          risk_level: 'low',
          risk_miles: 450,
        },
        {
          id: `${id}-checkpoint-2`,
          distance_miles: 900 + offset,
          latitude: 39.7 + offset * 0.01,
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
            risk_level: 'low',
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
      is_recommended: id === 'route-1',
    })
    const responseData = {
      status: 'planned',
      trip: request,
      routes: [route('route-1', 0), route('route-2', 1), route('route-3', 2)],
      recommendation: {
        route_id: 'route-1',
        status: 'recommended',
        message: 'Lowest risk route.',
      },
    }
    vi.mocked(apiClient.post).mockResolvedValue({ data: responseData })

    await expect(planTrip(request)).resolves.toEqual(responseData)

    const incompleteResponse = {
      ...responseData,
      routes: responseData.routes.map((item) => ({
        ...item,
        checkpoints: item.checkpoints.map((checkpoint) => ({
          ...checkpoint,
          hourly_forecast: checkpoint.hourly_forecast.slice(1),
        })),
      })),
    }
    vi.mocked(apiClient.post).mockResolvedValue({ data: incompleteResponse })

    await expect(planTrip(request)).rejects.toMatchObject({
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
