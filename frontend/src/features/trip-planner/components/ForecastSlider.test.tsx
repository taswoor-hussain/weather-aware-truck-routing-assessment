import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ForecastSlider } from './ForecastSlider'

describe('ForecastSlider', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('lets the user select any hour in the 48-hour forecast range', () => {
    const onChange = vi.fn()
    const onPlaybackChange = vi.fn()
    render(
      <ForecastSlider
        departureAt="2026-11-11T14:30:00Z"
        hour={0}
        isPlaying={false}
        onChange={onChange}
        onPlaybackChange={onPlaybackChange}
      />,
    )

    const slider = screen.getByRole('slider', {
      name: 'Forecast hours after departure',
    })
    expect(slider).toHaveAttribute('min', '0')
    expect(slider).toHaveAttribute('max', '48')
    expect(slider).toHaveAttribute('step', '1')

    fireEvent.change(slider, { target: { value: '24' } })

    expect(onChange).toHaveBeenCalledWith(24)
    expect(onPlaybackChange).toHaveBeenCalledWith(false)
    expect(screen.getByText(/\+0h after departure/)).toBeInTheDocument()
  })

  it('plays through hourly snapshots and pauses at the forecast horizon', () => {
    vi.useFakeTimers()
    const onChange = vi.fn()
    const onPlaybackChange = vi.fn()
    const { rerender } = render(
      <ForecastSlider
        departureAt="2026-11-11T14:30:00Z"
        hour={47}
        isPlaying={false}
        onChange={onChange}
        onPlaybackChange={onPlaybackChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Play forecast playback' }))
    expect(onPlaybackChange).toHaveBeenCalledWith(true)
    rerender(
      <ForecastSlider
        departureAt="2026-11-11T14:30:00Z"
        hour={47}
        isPlaying
        onChange={onChange}
        onPlaybackChange={onPlaybackChange}
      />,
    )
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(onChange).toHaveBeenCalledWith(48)
    expect(onPlaybackChange).toHaveBeenLastCalledWith(false)
  })
})
