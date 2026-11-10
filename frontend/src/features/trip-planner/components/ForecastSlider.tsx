import { useEffect } from 'react'
import { RISK_PRESENTATION } from '../utils/riskPresentation'

const MAX_FORECAST_HOUR = 48
const PLAYBACK_INTERVAL_MS = 500

interface ForecastSliderProps {
  departureAt: string
  hour: number
  isPlaying: boolean
  onChange: (hour: number) => void
  onPlaybackChange: (isPlaying: boolean) => void
}

const sliderClassName =
  'h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-teal-700'

export function ForecastSlider({
  departureAt,
  hour,
  isPlaying,
  onChange,
  onPlaybackChange,
}: ForecastSliderProps) {
  useEffect(() => {
    if (!isPlaying) return

    const timer = window.setInterval(() => {
      const nextHour = hour + 1
      onChange(nextHour)
      if (nextHour >= MAX_FORECAST_HOUR) {
        onPlaybackChange(false)
      }
    }, PLAYBACK_INTERVAL_MS)

    return () => window.clearInterval(timer)
  }, [hour, isPlaying, onChange, onPlaybackChange])

  const forecastTime = new Date(
    new Date(departureAt).getTime() + hour * 60 * 60 * 1000,
  )
  const formattedTime = new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(forecastTime)

  function togglePlayback() {
    if (hour >= MAX_FORECAST_HOUR) onChange(0)
    onPlaybackChange(!isPlaying)
  }

  return (
    <section
      aria-labelledby="forecast-slider-title"
      className="rounded-2xl border border-white/80 bg-white/95 p-3 shadow-[0_12px_35px_-16px_rgba(15,23,42,0.55)] backdrop-blur-md sm:p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-950 text-sm font-bold text-white transition hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
            onClick={togglePlayback}
            aria-label={isPlaying ? 'Pause forecast playback' : 'Play forecast playback'}
          >
            {isPlaying ? 'Ⅱ' : '▶'}
          </button>
          <div>
            <h4 id="forecast-slider-title" className="text-sm font-bold text-slate-950">
              Corridor forecast
            </h4>
            <p className="mt-0.5 text-xs text-slate-600">
              +{hour}h after departure · {formattedTime}
            </p>
          </div>
        </div>
        <p className="text-xs font-medium text-slate-500">
          Hourly forecast · 0–48 hours
        </p>
      </div>
      <label className="sr-only" htmlFor="forecast-hour">
        Forecast hours after departure
      </label>
      <input
        id="forecast-hour"
        className={`${sliderClassName} mt-5`}
        type="range"
        min={0}
        max={MAX_FORECAST_HOUR}
        step={1}
        value={hour}
        aria-valuetext={`Plus ${hour} hours after departure`}
        onChange={(event) => {
          onChange(Number(event.currentTarget.value))
          onPlaybackChange(false)
        }}
      />
      <div className="mt-2 flex justify-between text-[11px] font-medium text-slate-500" aria-hidden="true">
        {[0, 12, 24, 36, 48].map((tick) => (
          <span key={tick}>{tick}h</span>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-slate-100 pt-2.5">
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
          Checkpoint risk
        </span>
        {Object.values(RISK_PRESENTATION).map(({ label, color }) => (
          <span key={label} className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600">
            <i aria-hidden="true" className="size-2 rounded-full" style={{ backgroundColor: color }} />
            {label}
          </span>
        ))}
      </div>
    </section>
  )
}
