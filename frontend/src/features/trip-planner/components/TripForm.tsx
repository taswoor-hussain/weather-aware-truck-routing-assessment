import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, CloudSun, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { FormField } from '../../../shared/components/FormField'
import { StatusBanner } from '../../../shared/components/StatusBanner'
import { ApiError, toApiError } from '../../../shared/api/ApiError'
import { tripFormSchema, type TripFormInput, type TripFormValues } from '../schemas/tripSchema'
import type { PlaceSuggestion, TripPlanResponse, TripRequest } from '../types'
import { usePlanTrip } from '../hooks/usePlanTrip'
import { PlaceInput } from './PlaceInput'

const inputClassName =
  'min-h-11 min-w-0 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus:border-teal-700 focus:bg-white focus:ring-4 focus:ring-teal-700/10 aria-[invalid=true]:border-rose-400 aria-[invalid=true]:focus:ring-rose-500/10'

interface TripFormProps {
  onPlan: (plan: TripPlanResponse | null) => void
}

function toTripRequest(values: TripFormValues): TripRequest {
  return {
    origin: values.origin,
    destination: values.destination,
    departure_at: new Date(values.departureLocal).toISOString(),
    load_weight_lb: values.loadWeight,
    checkpoint_interval_miles: values.checkpointInterval,
  }
}

export function TripForm({ onPlan }: TripFormProps) {
  const mutation = usePlanTrip()
  const [requestError, setRequestError] = useState<ApiError | null>(null)
  const [selectedOrigin, setSelectedOrigin] = useState<PlaceSuggestion | null>(null)
  const [selectedDestination, setSelectedDestination] = useState<PlaceSuggestion | null>(null)
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
  const departureInput = form.register('departureLocal')
  const loadInput = form.register('loadWeight')
  const checkpointInput = form.register('checkpointInterval')

  const onSubmit: SubmitHandler<TripFormValues> = async (values) => {
    mutation.reset()
    setRequestError(null)
    onPlan(null)
    if (!selectedOrigin) {
      form.setError('origin', {
        type: 'manual',
        message: 'Choose an origin from the location suggestions.',
      })
    }
    if (!selectedDestination) {
      form.setError('destination', {
        type: 'manual',
        message: 'Choose a destination from the location suggestions.',
      })
    }
    if (!selectedOrigin || !selectedDestination) return

    try {
      const plan = await mutation.mutateAsync(toTripRequest(values))
      onPlan(plan)
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
      className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5"
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h2 id="trip-form-title" className="text-lg font-bold tracking-tight text-slate-950">
            Plan a safer trip
          </h2>
          <p className="mt-1 text-xs text-slate-500">Compare routes by weather risk and drive time.</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-teal-50 px-2.5 py-1.5 text-[10px] font-bold text-teal-800">
          <CloudSun aria-hidden="true" className="size-3.5" />
          Weather + ETA
        </span>
      </div>

      <form className="mt-4 min-w-0 space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <div className="space-y-3.5">
          <PlaceInput
            id="origin"
            label="Origin"
            value={form.watch('origin')}
            placeholder="Search a city, address, or ZIP"
            hintId="origin-hint"
            error={form.formState.errors.origin?.message}
            selected={selectedOrigin !== null}
            disabled={mutation.isPending}
            onChange={(value) => {
              setSelectedOrigin(null)
              form.setValue('origin', value, { shouldDirty: true })
              form.clearErrors('origin')
              setRequestError(null)
              onPlan(null)
              mutation.reset()
            }}
            onSelect={(place) => {
              setSelectedOrigin(place)
              form.setValue('origin', place.label, { shouldDirty: true, shouldValidate: true })
              form.clearErrors('origin')
              setRequestError(null)
              onPlan(null)
              mutation.reset()
            }}
          />

          <PlaceInput
            id="destination"
            label="Destination"
            value={form.watch('destination')}
            placeholder="Search a city, address, or ZIP"
            hintId="destination-hint"
            error={form.formState.errors.destination?.message}
            selected={selectedDestination !== null}
            disabled={mutation.isPending}
            onChange={(value) => {
              setSelectedDestination(null)
              form.setValue('destination', value, { shouldDirty: true })
              form.clearErrors('destination')
              setRequestError(null)
              onPlan(null)
              mutation.reset()
            }}
            onSelect={(place) => {
              setSelectedDestination(place)
              form.setValue('destination', place.label, { shouldDirty: true, shouldValidate: true })
              form.clearErrors('destination')
              setRequestError(null)
              onPlan(null)
              mutation.reset()
            }}
          />
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-3.5">
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
                onPlan(null)
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
                  onPlan(null)
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
                onPlan(null)
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

        <div className="border-t border-slate-100 pt-3">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white shadow-md shadow-slate-950/10 transition hover:bg-teal-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:cursor-wait disabled:opacity-70"
          >
            {mutation.isPending ? (
              <>
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                Finding routes…
              </>
            ) : (
              <>
                Find truck routes
                <ArrowRight aria-hidden="true" className="size-4" />
              </>
            )}
          </button>
          <p className="mt-2 text-center text-[11px] leading-4 text-slate-500">
            Compare weather and ETA across three routes.
          </p>
        </div>
      </form>
    </section>
  )
}
