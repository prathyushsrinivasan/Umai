import { act, renderHook } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'

import { useRestaurantFilters } from './useRestaurantFilters'

function wrapperFor(initialUrl: string) {
  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[initialUrl]}>{children}</MemoryRouter>
  )
}

function renderFilters(initialUrl = '/search') {
  return renderHook(() => useRestaurantFilters(), { wrapper: wrapperFor(initialUrl) })
}

describe('useRestaurantFilters', () => {
  it('reads filters out of the URL, so a filtered result is shareable', () => {
    const { result } = renderFilters(
      '/search?keyword=ラーメン&areas=ueno&areas=asakusa&minRating=4',
    )

    expect(result.current.filters.keyword).toBe('ラーメン')
    expect(result.current.filters.areas).toEqual(['ueno', 'asakusa'])
    expect(result.current.filters.minRating).toBe(4)
  })

  it('defaults to no filters and page 0', () => {
    const { result } = renderFilters()

    expect(result.current.filters.areas).toEqual([])
    expect(result.current.filters.keyword).toBeUndefined()
    expect(result.current.filters.page).toBe(0)
    expect(result.current.activeFilterCount).toBe(0)
  })

  it('toggles a value on and off again', () => {
    const { result } = renderFilters()

    act(() => result.current.toggleValue('areas', 'ueno'))
    expect(result.current.filters.areas).toEqual(['ueno'])

    act(() => result.current.toggleValue('areas', 'ueno'))
    expect(result.current.filters.areas).toEqual([])
  })

  it('accumulates several values of the same filter', () => {
    const { result } = renderFilters()

    act(() => result.current.toggleValue('categories', 'ramen'))
    act(() => result.current.toggleValue('categories', 'cafe'))

    expect(result.current.filters.categories).toEqual(['ramen', 'cafe'])
  })

  it('returns to the first page when filters change', () => {
    // Otherwise a narrower filter could land the user on a page that no longer exists.
    const { result } = renderFilters('/search?page=3')
    expect(result.current.filters.page).toBe(3)

    act(() => result.current.toggleValue('areas', 'ueno'))

    expect(result.current.filters.page).toBe(0)
  })

  it('resets the page when the keyword changes', () => {
    const { result } = renderFilters('/search?page=2')

    act(() => result.current.setKeyword('カフェ'))

    expect(result.current.filters.keyword).toBe('カフェ')
    expect(result.current.filters.page).toBe(0)
  })

  it('drops the keyword when cleared', () => {
    const { result } = renderFilters('/search?keyword=カフェ')

    act(() => result.current.setKeyword(''))

    expect(result.current.filters.keyword).toBeUndefined()
  })

  it('counts every active filter, so the UI can show how many are applied', () => {
    const { result } = renderFilters(
      '/search?areas=ueno&categories=ramen&priceRanges=BUDGET&minRating=4',
    )

    expect(result.current.activeFilterCount).toBe(4)
  })

  it('clears everything at once', () => {
    const { result } = renderFilters('/search?areas=ueno&categories=ramen&keyword=x')

    act(() => result.current.clearAll())

    expect(result.current.activeFilterCount).toBe(0)
    expect(result.current.filters.keyword).toBeUndefined()
  })

  it('keeps other filters when paging', () => {
    const { result } = renderFilters('/search?areas=ueno')

    act(() => result.current.setPage(2))

    expect(result.current.filters.page).toBe(2)
    expect(result.current.filters.areas).toEqual(['ueno'])
  })
})
