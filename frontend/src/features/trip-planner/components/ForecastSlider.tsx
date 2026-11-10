import { useEffect, useState } from 'react'

const MAX_FORECAST_HOUR = 48
const PLAYBACK_INTERVAL_MS = 500

interface ForecastSliderProps {
  departureAt: string
  hour: number
  onChange: (hour: number) => void
}

const sliderClassName =
  'h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-teal-700'

export function ForecastSlider({
  departureAt,
  hour,
  onChange,
}: ForecastSliderProps) {
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    if (!isPlaying) return

    const timer = window.setInterval(() => {
      const nextHour = hour + 1
      onChange(nextHour)
      if (nextHour >= MAX_FORECAST_HOUR) {
        setIsPlaying(false)
      }
    }, PLAYBACK_INTERVAL_MS)

    return () => window.clearInterval(timer)
  }, [hour, isPlaying, onChange])

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
    setIsPlaying((playing) => !playing)
  }

  return (
    <section
      aria-labelledby="forecast-slider-title"
      className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
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
          setIsPlaying(false)
          onChange(Number(event.currentTarget.value))
        }}
      />
      <div className="mt-2 flex justify-between text-[11px] font-medium text-slate-500" aria-hidden="true">
        {[0, 12, 24, 36, 48].map((tick) => (
          <span key={tick}>{tick}h</span>
        ))}
      </div>
    </section>
  )
}
