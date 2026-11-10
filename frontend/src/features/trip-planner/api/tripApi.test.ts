import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../../../shared/api/apiClient'
import { validateTrip } from './tripApi'

vi.mock('../../../shared/api/apiClient', () => ({
  apiClient: {
    post: vi.fn(),
  },
}))

describe('validateTrip', () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset()
  })

  it('rejects a successful response that does not match the API contract', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { status: 'ok' } })

    await expect(
      validateTrip({
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
      validateTrip({
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
