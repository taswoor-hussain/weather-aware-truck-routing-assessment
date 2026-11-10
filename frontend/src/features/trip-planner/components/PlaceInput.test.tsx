import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../shared/api/ApiError'
import { searchPlaces } from '../api/tripApi'
import type { PlaceSuggestion } from '../types'
import { PlaceInput } from './PlaceInput'

vi.mock('../api/tripApi', () => ({
  searchPlaces: vi.fn(),
}))

const chicago: PlaceSuggestion = {
  label: 'Chicago, IL',
  latitude: 41.8781,
  longitude: -87.6298,
}

describe('PlaceInput', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(searchPlaces).mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('debounces queries and supports keyboard selection', async () => {
    vi.mocked(searchPlaces).mockResolvedValue([chicago])
    const onChange = vi.fn()
    const onSelect = vi.fn()
    render(
      <PlaceInput
        id="origin"
        label="Origin"
        value="Chi"
        placeholder="Search a place"
        hintId="origin-hint"
        selected={false}
        disabled={false}
        onChange={onChange}
        onSelect={onSelect}
      />,
    )

    fireEvent.focus(screen.getByRole('combobox', { name: 'Origin' }))
    expect(searchPlaces).not.toHaveBeenCalled()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(249)
    })
    expect(searchPlaces).not.toHaveBeenCalled()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })

    expect(screen.getByRole('option', { name: /Chicago, IL/ })).toBeInTheDocument()
    expect(screen.queryByText('Searching locations…')).not.toBeInTheDocument()
    expect(searchPlaces).toHaveBeenCalledWith('Chi', expect.any(AbortSignal))

    fireEvent.keyDown(screen.getByRole('combobox', { name: 'Origin' }), {
      key: 'ArrowDown',
    })
    fireEvent.keyDown(screen.getByRole('combobox', { name: 'Origin' }), {
      key: 'Enter',
    })

    expect(onSelect).toHaveBeenCalledWith(chicago)
  })

  it('shows a recoverable status when place search fails', async () => {
    vi.mocked(searchPlaces).mockRejectedValue(
      new ApiError('Unable to reach the server. Check your connection and try again.'),
    )
    render(
      <PlaceInput
        id="origin"
        label="Origin"
        value="Chicago"
        placeholder="Search a place"
        hintId="origin-hint"
        selected={false}
        disabled={false}
        onChange={vi.fn()}
        onSelect={vi.fn()}
      />,
    )

    fireEvent.focus(screen.getByRole('combobox', { name: 'Origin' }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250)
    })

    expect(screen.getByRole('status')).toHaveTextContent(
      'Check your connection and try again.',
    )
  })
})
