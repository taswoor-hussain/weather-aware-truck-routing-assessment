import axios from 'axios'

export type ApiFieldErrors = Record<string, string>

interface ApiErrorResponse {
  detail?: unknown
  non_field_errors?: unknown
  [field: string]: unknown
}

function firstMessage(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    return value.find((item): item is string => typeof item === 'string')
  }
  return undefined
}

export class ApiError extends Error {
  readonly status?: number
  readonly fieldErrors: ApiFieldErrors

  constructor(
    message: string,
    status?: number,
    fieldErrors: ApiFieldErrors = {},
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

export function toApiError(error: unknown): ApiError {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return new ApiError(
      error instanceof Error ? error.message : 'An unexpected error occurred.',
    )
  }

  if (!error.response) {
    const message = error.code === 'ECONNABORTED'
      ? 'The request timed out. Check your connection and try again.'
      : 'Unable to reach the server. Check your connection and try again.'
    return new ApiError(message)
  }

  const payload = error.response.data
  const fieldErrors: ApiFieldErrors = {}
  let message: string | undefined

  if (payload && typeof payload === 'object') {
    message = firstMessage(payload.detail) ?? firstMessage(payload.non_field_errors)
    for (const [field, value] of Object.entries(payload)) {
      if (field === 'detail' || field === 'non_field_errors') continue
      const fieldMessage = firstMessage(value)
      if (fieldMessage) fieldErrors[field] = fieldMessage
    }
  }

  return new ApiError(
    message ?? (error.response.status >= 500
      ? 'The server could not complete this request. Please try again.'
      : 'Please review the highlighted information.'),
    error.response.status,
    fieldErrors,
  )
}
