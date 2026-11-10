import { z } from 'zod'
import { ApiError, toApiError } from '../../../shared/api/ApiError'
import { apiClient } from '../../../shared/api/apiClient'
import { CHECKPOINT_INTERVALS, type TripRequest, type TripValidationResponse } from '../types'

const tripResponseSchema = z.object({
  status: z.literal('validated'),
  trip: z.object({
    origin: z.string(),
    destination: z.string(),
    departure_at: z.string().datetime({ offset: true }),
    load_weight_lb: z.number().int().positive(),
    checkpoint_interval_miles: z.union(
      CHECKPOINT_INTERVALS.map((value) => z.literal(value)),
    ),
  }),
})

export async function validateTrip(
  request: TripRequest,
): Promise<TripValidationResponse> {
  try {
    const { data } = await apiClient.post<unknown>('/plan/', request)
    const result = tripResponseSchema.safeParse(data)
    if (!result.success) {
      throw new ApiError('The server returned an invalid trip response.')
    }
    return result.data
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw toApiError(error)
  }
}
