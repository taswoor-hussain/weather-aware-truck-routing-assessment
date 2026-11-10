import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { FormField } from '../../../shared/components/FormField'
import { StatusBanner } from '../../../shared/components/StatusBanner'
import { ApiError, toApiError } from '../../../shared/api/ApiError'
import { tripFormSchema, type TripFormInput, type TripFormValues } from '../schemas/tripSchema'
import type { TripRequest } from '../types'
import { usePlanTrip } from '../hooks/usePlanTrip'
import { TripResult } from './TripResult'

const inputClassName =
  'min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-teal-700 focus:ring-4 focus:ring-teal-700/10 aria-[invalid=true]:border-rose-400 aria-[invalid=true]:focus:ring-rose-500/10'

function toTripRequest(values: TripFormValues): TripRequest {
  return {
    origin: values.origin,
    destination: values.destination,
    departure_at: new Date(values.departureLocal).toISOString(),
    load_weight_lb: values.loadWeight,
    checkpoint_interval_miles: values.checkpointInterval,
  }
}

export function TripForm() {
  const mutation = usePlanTrip()
  const [requestError, setRequestError] = useState<ApiError | null>(null)
  const form = useForm<TripFormInput, undefined, TripFormValues>({
    resolver: zodResolver(tripFormSchema),
    defaultValues: {
      origin: '',
      destination: '',
      departureLocal: '',
      loadWeight: '32000',
      checkpointInterval: '25',
    },
  })
  const originInput = form.register('origin')
  const destinationInput = form.register('destination')
  const departureInput = form.register('departureLocal')
  const loadInput = form.register('loadWeight')
  const checkpointInput = form.register('checkpointInterval')

  const onSubmit: SubmitHandler<TripFormValues> = async (values) => {
    mutation.reset()
    setRequestError(null)
    try {
      await mutation.mutateAsync(toTripRequest(values))
    } catch (error) {
      const apiError = toApiError(error)

      const fieldMap: Record<string, keyof TripFormInput> = {
        origin: 'origin',
        destination: 'destination',
        departure_at: 'departureLocal',
        load_weight_lb: 'loadWeight',
        checkpoint_interval_miles: 'checkpointInterval',
      } as const

      let hasFieldError = false
      for (const [apiField, message] of Object.entries(apiError.fieldErrors)) {
        const formField = fieldMap[apiField]
        if (formField) {
          form.setError(formField, {
            type: 'server',
            message,
          })
          hasFieldError = true
        }
      }

      if (hasFieldError) mutation.reset()
      else setRequestError(apiError)
    }
  }

  const fieldProps = (field: keyof TripFormInput) => {
    const error = form.formState.errors[field]
    return {
      'aria-invalid': Boolean(error),
      'aria-describedby': [
        `${field}-hint`,
        error ? `${field}-error` : undefined,
      ].filter(Boolean).join(' '),
    }
  }

  return (
    <section
      aria-labelledby="trip-form-title"
      className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_24px_70px_-35px_rgba(15,35,48,0.28)] sm:p-8"
    >
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-800">
            Your trip
          </p>
          <h2 id="trip-form-title" className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            Start with the details
          </h2>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
          Step 01 / 03
        </span>
      </div>

      <form className="mt-6 space-y-6" onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
          <FormField
            id="origin"
            label="Origin"
            error={form.formState.errors.origin?.message}
            hint="City, state, or ZIP code"
          >
            <input
              id="origin"
              autoComplete="address-level2"
              className={inputClassName}
              placeholder="Chicago, IL"
              maxLength={120}
              {...originInput}
              {...fieldProps('origin')}
              disabled={mutation.isPending}
              onChange={(event) => {
                void originInput.onChange(event)
                form.clearErrors('origin')
                setRequestError(null)
                mutation.reset()
              }}
            />
          </FormField>

          <FormField
            id="destination"
            label="Destination"
            error={form.formState.errors.destination?.message}
            hint="Where should the truck arrive?"
          >
            <input
              id="destination"
              autoComplete="address-level2"
              className={inputClassName}
              placeholder="Denver, CO"
              maxLength={120}
              {...destinationInput}
              {...fieldProps('destination')}
              disabled={mutation.isPending}
              onChange={(event) => {
                void destinationInput.onChange(event)
                form.clearErrors('destination')
                setRequestError(null)
                mutation.reset()
              }}
            />
          </FormField>

          <FormField
            id="departureLocal"
            label="Departure date & time"
            error={form.formState.errors.departureLocal?.message}
            hint="Shown in your local timezone"
          >
            <input
              id="departureLocal"
              type="datetime-local"
              className={inputClassName}
              {...departureInput}
              {...fieldProps('departureLocal')}
              disabled={mutation.isPending}
              onChange={(event) => {
                void departureInput.onChange(event)
                form.clearErrors('departureLocal')
                setRequestError(null)
                mutation.reset()
              }}
            />
          </FormField>

          <FormField
            id="loadWeight"
            label="Cargo weight"
            error={form.formState.errors.loadWeight?.message}
            hint="Enter total loaded truck weight"
          >
            <div className="relative">
              <input
                id="loadWeight"
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                className={`${inputClassName} pr-14`}
                placeholder="32,000"
                {...loadInput}
                {...fieldProps('loadWeight')}
                disabled={mutation.isPending}
                onChange={(event) => {
                  void loadInput.onChange(event)
                  form.clearErrors('loadWeight')
                  setRequestError(null)
                  mutation.reset()
                }}
              />
              <span className="pointer-events-none absolute inset-y-0 right-4 inline-flex items-center text-sm text-slate-500">
                lb
              </span>
            </div>
          </FormField>

          <FormField
            id="checkpointInterval"
            label="Weather sampling"
            hint="Closer checkpoints give more detail"
          >
            <select
              id="checkpointInterval"
              className={inputClassName}
              {...checkpointInput}
              {...fieldProps('checkpointInterval')}
              disabled={mutation.isPending}
              onChange={(event) => {
                void checkpointInput.onChange(event)
                form.clearErrors('checkpointInterval')
                setRequestError(null)
                mutation.reset()
              }}
            >
              <option value="10">Every 10 miles</option>
              <option value="25">Every 25 miles</option>
              <option value="50">Every 50 miles</option>
            </select>
          </FormField>
        </div>

        {requestError && (
          <StatusBanner variant="error" title="We couldn't verify this trip">
            {requestError.message}
          </StatusBanner>
        )}

        {mutation.isSuccess && <TripResult plan={mutation.data} />}

        <div className="flex flex-col gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-sm text-xs leading-5 text-slate-500">
            Route options are generated for the departure time and truck type you entered.
          </p>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-3 whitespace-nowrap rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white shadow-lg shadow-slate-950/10 transition hover:bg-teal-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:cursor-wait disabled:opacity-70"
          >
            {mutation.isPending ? (
              <>
                <span
                  aria-hidden="true"
                  className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                />
                Finding routes…
              </>
            ) : (
              <>
                Find truck routes
                <span aria-hidden="true">→</span>
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  )
}
