import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Check, Search } from 'lucide-react'
import { toApiError } from '../../../shared/api/ApiError'
import { searchPlaces } from '../api/tripApi'
import type { PlaceSuggestion } from '../types'

const SEARCH_DELAY_MS = 250
const MIN_QUERY_LENGTH = 3

interface PlaceInputProps {
  id: string
  label: string
  value: string
  placeholder: string
  hintId: string
  error?: string
  selected: boolean
  disabled: boolean
  onChange: (value: string) => void
  onSelect: (place: PlaceSuggestion) => void
}

export function PlaceInput({
  id,
  label,
  value,
  placeholder,
  hintId,
  error,
  selected,
  disabled,
  onChange,
  onSelect,
}: PlaceInputProps) {
  const [searchResult, setSearchResult] = useState<{
    query: string
    places: PlaceSuggestion[]
  } | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [loadingQuery, setLoadingQuery] = useState<string | null>(null)
  const [searchFailure, setSearchFailure] = useState<{
    query: string
    message: string
  } | null>(null)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = `${id}-suggestions`
  const query = value.trim()
  const canSearch = !disabled && !selected && query.length >= MIN_QUERY_LENGTH
  const hasSearched = canSearch && searchResult?.query === query
  const suggestions =
    hasSearched && searchResult ? searchResult.places : []
  const isLoading = canSearch && loadingQuery === query
  const searchError =
    canSearch && searchFailure?.query === query ? searchFailure.message : null

  useEffect(() => {
    if (!canSearch) return

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLoadingQuery(query)
      try {
        const places = await searchPlaces(query, controller.signal)
        if (!controller.signal.aborted) {
          setSearchResult({ query, places })
          setActiveIndex(-1)
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setSearchFailure({ query, message: toApiError(error).message })
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingQuery((currentQuery) => currentQuery === query ? null : currentQuery)
        }
      }
    }, SEARCH_DELAY_MS)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [canSearch, query])

  function chooseSuggestion(place: PlaceSuggestion) {
    onSelect(place)
    setLoadingQuery(null)
    setIsOpen(false)
    setActiveIndex(-1)
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setIsOpen(false)
      setActiveIndex(-1)
      return
    }
    if (!isOpen || suggestions.length === 0) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => (index + 1) % suggestions.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => (index <= 0 ? suggestions.length - 1 : index - 1))
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault()
      chooseSuggestion(suggestions[activeIndex])
    }
  }

  const describedBy = error ? `${hintId} ${id}-error` : hintId

  return (
    <div className="relative">
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold tracking-wide text-slate-700">
        {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen && suggestions.length > 0}
          aria-controls={listId}
          aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          autoComplete="off"
          maxLength={120}
          disabled={disabled}
          value={value}
          placeholder={placeholder}
          className="min-h-11 min-w-0 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 pr-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus:border-teal-700 focus:bg-white focus:ring-4 focus:ring-teal-700/10 aria-[invalid=true]:border-rose-400 aria-[invalid=true]:focus:ring-rose-500/10"
          onFocus={() => setIsOpen(true)}
          onChange={(event) => {
            onChange(event.currentTarget.value)
            setLoadingQuery(null)
            setIsOpen(true)
            setActiveIndex(-1)
          }}
          onKeyDown={onKeyDown}
          onBlur={() => {
            window.setTimeout(() => setIsOpen(false), 120)
          }}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-4 inline-flex items-center text-slate-400"
        >
          {isLoading ? (
            <span className="size-4 animate-spin rounded-full border-2 border-slate-300 border-t-teal-700" />
          ) : selected ? (
            <Check aria-hidden="true" className="size-4 text-teal-700" strokeWidth={2.5} />
          ) : (
            <Search aria-hidden="true" className="size-4" />
          )}
        </span>
      </div>
      <p id={hintId} className="mt-1 text-[11px] leading-4 text-slate-500">
        {selected ? 'Verified location' : 'Type at least 3 characters to search'}
      </p>
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs font-medium text-rose-700">
          {error}
        </p>
      )}
      {isOpen && suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          aria-label={`${label} suggestions`}
          className="absolute z-[1000] mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
        >
          {suggestions.map((place, index) => (
            <li
              key={`${place.label}-${place.latitude}-${place.longitude}`}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              className={`cursor-pointer rounded-lg px-3 py-2.5 text-sm ${
                index === activeIndex ? 'bg-teal-50 text-teal-950' : 'text-slate-800 hover:bg-slate-50'
              }`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => chooseSuggestion(place)}
            >
              <span className="block font-medium">{place.label}</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                Use this location
              </span>
            </li>
          ))}
        </ul>
      )}
      {isOpen && isLoading && (
        <p role="status" className="mt-2 text-xs text-slate-500">
          Searching locations…
        </p>
      )}
      {isOpen && searchError && (
        <p role="status" className="mt-2 text-xs text-rose-700">
          {searchError}
        </p>
      )}
      {isOpen && hasSearched && !isLoading && !searchError && value.trim().length >= MIN_QUERY_LENGTH &&
        suggestions.length === 0 && (
          <p role="status" className="mt-2 text-xs text-slate-500">
            No matching places found. Try a city and state or ZIP code.
          </p>
        )}
    </div>
  )
}
