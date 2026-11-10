import { z } from 'zod'
import { ApiError, toApiError } from '../../../shared/api/ApiError'
import { apiClient } from '../../../shared/api/apiClient'
import {
  CHECKPOINT_INTERVALS,
  type TripPlanResponse,
  type TripRequest,
} from '../types'

const tripPlanResponseSchema = z.object({
  status: z.literal('planned'),
  trip: z.object({
    origin: z.string(),
    destination: z.string(),
    departure_at: z.string().datetime({ offset: true }),
    load_weight_lb: z.number().int().positive(),
    checkpoint_interval_miles: z.union(
      CHECKPOINT_INTERVALS.map((value) => z.literal(value)),
    ),
  }),
  routes: z
    .array(
      z.object({
        id: z.string().min(1),
        summary: z.object({
          distance_miles: z.number().positive(),
          travel_time_seconds: z.number().int().positive(),
          departure_at: z.string().datetime({ offset: true }),
          arrival_at: z.string().datetime({ offset: true }),
        }),
        geometry: z.object({
          type: z.literal('LineString'),
          coordinates: z.array(z.tuple([z.number(), z.number()])).min(2),
        }),
      }),
    )
    .length(3),
})

export async function planTrip(
  request: TripRequest,
): Promise<TripPlanResponse> {
  try {
    const { data } = await apiClient.post<unknown>('/plan/', request)
    const result = tripPlanResponseSchema.safeParse(data)
    if (!result.success) {
      throw new ApiError('The server returned an invalid trip response.')
    }
    return result.data
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw toApiError(error)
  }
}
