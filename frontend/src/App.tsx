import { useState, type FormEvent } from 'react'
import {
  validateTrip,
  type CheckpointInterval,
  type TripField,
  type TripRequest,
  type ValidatedTrip,
  TripApiError,
} from './api'

function App() {
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [departureLocal, setDepartureLocal] = useState('')
  const [loadWeight, setLoadWeight] = useState('')
  const [checkpointInterval, setCheckpointInterval] =
    useState<CheckpointInterval>(25)
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<TripField, string>>
  >({})
  const [pageError, setPageError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validatedTrip, setValidatedTrip] = useState<ValidatedTrip | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPageError('')
    setFieldErrors({})
    setValidatedTrip(null)

    const departureDate = new Date(departureLocal)
    if (Number.isNaN(departureDate.getTime())) {
      setFieldErrors({ departure_at: 'Enter a valid departure date and time.' })
      return
    }

    const request: TripRequest = {
      origin: origin.trim(),
      destination: destination.trim(),
      departure_at: departureDate.toISOString(),
      load_weight_lb: Number(loadWeight),
      checkpoint_interval_miles: checkpointInterval,
    }

    setIsSubmitting(true)
    try {
      const trip = await validateTrip(request)
      setValidatedTrip(trip)
    } catch (error) {
      if (error instanceof TripApiError) {
        setFieldErrors(error.fieldErrors)
        if (Object.keys(error.fieldErrors).length === 0) {
          setPageError(error.message)
        }
      } else {
        setPageError(
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred while validating the trip.',
        )
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  function getFieldProps(field: TripField) {
    return {
      'aria-invalid': Boolean(fieldErrors[field]),
      'aria-describedby': fieldErrors[field] ? `${field}-error` : undefined,
    }
  }

  function renderFieldError(field: TripField) {
    const message = fieldErrors[field]
    return message ? (
      <span className="field-error" id={`${field}-error`}>
        {message}
      </span>
    ) : null
  }

  return (
    <main className="app-shell">
      <header className="brand">
        <span className="brand-mark" aria-hidden="true">
          ↗
        </span>
        <span>Roadwise</span>
      </header>

      <section className="intro" aria-labelledby="page-title">
        <span className="eyebrow">Weather-aware truck routing</span>
        <h1 id="page-title">Plan a safer trip.</h1>
        <p>
          Compare routes using the weather your truck is expected to encounter,
          your cargo weight, and time on the road.
        </p>
      </section>

      <section className="planner-card" aria-labelledby="trip-form-title">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Trip details</span>
            <h2 id="trip-form-title">Where are you headed?</h2>
          </div>
          <span className="step-label">Step 1 of 3</span>
        </div>

        <form className="trip-form" onSubmit={handleSubmit} noValidate>
          <div className="form-grid">
            <label className="field">
              <span>Origin</span>
              <input
                autoComplete="address-level2"
                maxLength={120}
                placeholder="e.g. Chicago, IL"
                required
                value={origin}
                {...getFieldProps('origin')}
                onChange={(event) => setOrigin(event.target.value)}
              />
              {renderFieldError('origin')}
            </label>

            <label className="field">
              <span>Destination</span>
              <input
                autoComplete="address-level2"
                maxLength={120}
                placeholder="e.g. Denver, CO"
                required
                value={destination}
                {...getFieldProps('destination')}
                onChange={(event) => setDestination(event.target.value)}
              />
              {renderFieldError('destination')}
            </label>

            <label className="field">
              <span>Departure date and time</span>
              <input
                type="datetime-local"
                required
                value={departureLocal}
                {...getFieldProps('departure_at')}
                onChange={(event) => setDepartureLocal(event.target.value)}
              />
              <span className="field-hint">Times are sent using your local timezone.</span>
              {renderFieldError('departure_at')}
            </label>

            <label className="field">
              <span>Load weight</span>
              <span className="input-with-unit">
                <input
                  type="number"
                  min="1"
                  max="100000"
                  step="1"
                  placeholder="e.g. 32000"
                  required
                  value={loadWeight}
                  {...getFieldProps('load_weight_lb')}
                  onChange={(event) => setLoadWeight(event.target.value)}
                />
                <span>lb</span>
              </span>
              {renderFieldError('load_weight_lb')}
            </label>

            <label className="field field-interval">
              <span>Weather checkpoint interval</span>
              <select
                value={checkpointInterval}
                {...getFieldProps('checkpoint_interval_miles')}
                onChange={(event) => {
                  const interval = Number(event.target.value)
                  if (interval === 10 || interval === 25 || interval === 50) {
                    setCheckpointInterval(interval)
                  }
                }}
              >
                <option value={10}>Every 10 miles</option>
                <option value={25}>Every 25 miles</option>
                <option value={50}>Every 50 miles</option>
              </select>
            </label>
          </div>

          {pageError && (
            <p className="form-error" role="alert">
              {pageError}
            </p>
          )}

          <div className="form-footer">
            <p>Weather-aware route comparisons are coming in the next step.</p>
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Checking trip…' : 'Validate trip'}
              {!isSubmitting && <span aria-hidden="true">→</span>}
            </button>
          </div>
        </form>
      </section>

      {validatedTrip && (
        <section className="result-card" role="status" aria-live="polite">
          <span className="result-check" aria-hidden="true">✓</span>
          <div>
            <h2>Trip details verified</h2>
            <p>
              {validatedTrip.origin} to {validatedTrip.destination} ·{' '}
              {validatedTrip.load_weight_lb.toLocaleString()} lb · checkpoints every{' '}
              {validatedTrip.checkpoint_interval_miles} miles
            </p>
            <span className="field-hint">
              Departure {new Date(validatedTrip.departure_at).toLocaleString()}
            </span>
          </div>
        </section>
      )}
    </main>
  )
}

export default App
