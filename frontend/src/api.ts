export type TripField =
  | 'origin'
  | 'destination'
  | 'departure_at'
  | 'load_weight_lb'
  | 'checkpoint_interval_miles'

export type CheckpointInterval = 10 | 25 | 50

export interface TripRequest {
  origin: string
  destination: string
  departure_at: string
  load_weight_lb: number
  checkpoint_interval_miles: CheckpointInterval
}

export type ValidatedTrip = TripRequest

interface TripValidationResponse {
  status: 'validated'
  trip: ValidatedTrip
}

export class TripApiError extends Error {
  readonly fieldErrors: Partial<Record<TripField, string>>

  constructor(
    message: string,
    fieldErrors: Partial<Record<TripField, string>> = {},
  ) {
    super(message)
    this.name = 'TripApiError'
    this.fieldErrors = fieldErrors
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isInterval(value: unknown): value is CheckpointInterval {
  return value === 10 || value === 25 || value === 50
}

function isTripResponse(value: unknown): value is TripValidationResponse {
  if (!isRecord(value) || value.status !== 'validated' || !isRecord(value.trip)) {
    return false
  }

  const trip = value.trip
  return (
    typeof trip.origin === 'string' &&
    typeof trip.destination === 'string' &&
    typeof trip.departure_at === 'string' &&
    typeof trip.load_weight_lb === 'number' &&
    isInterval(trip.checkpoint_interval_miles)
  )
}

function readValidationErrors(
  value: unknown,
): { message: string; fields: Partial<Record<TripField, string>> } {
  const fields: Partial<Record<TripField, string>> = {}
  const fieldNames: TripField[] = [
    'origin',
    'destination',
    'departure_at',
    'load_weight_lb',
    'checkpoint_interval_miles',
  ]

  if (isRecord(value)) {
    for (const field of fieldNames) {
      const messages = value[field]
      if (Array.isArray(messages)) {
        const text = messages.filter((item): item is string => typeof item === 'string')
        if (text.length > 0) fields[field] = text.join(' ')
      }
    }

    const detail = value.detail
    if (typeof detail === 'string') return { message: detail, fields }

    const nonFieldErrors = value.non_field_errors
    if (Array.isArray(nonFieldErrors)) {
      const messages = nonFieldErrors.filter(
        (item): item is string => typeof item === 'string',
      )
      if (messages.length > 0) return { message: messages.join(' '), fields }
    }
  }

  return {
    message: Object.keys(fields).length
      ? 'Please correct the highlighted fields.'
      : 'The trip request could not be validated.',
    fields,
  }
}

export async function validateTrip(request: TripRequest): Promise<ValidatedTrip> {
  const response = await fetch('/api/plan/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new Error(`The API returned an unreadable response (${response.status}).`)
  }

  if (!response.ok) {
    const errors = readValidationErrors(payload)
    throw new TripApiError(errors.message, errors.fields)
  }

  if (!isTripResponse(payload)) {
    throw new Error('The API returned an unexpected trip response.')
  }

  return payload.trip
}
