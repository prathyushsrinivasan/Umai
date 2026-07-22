import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import type { PriceRange, RestaurantSearchParams, VegetarianType } from '../types/restaurant'

/**
 * Keeps search filters in the URL rather than component state.
 *
 * That makes a filtered result shareable and bookmarkable, survives a reload, and
 * lets the back button step through filter changes — none of which work if the
 * filters live only in memory.
 */
export function useRestaurantFilters() {
  const [searchParams, setSearchParams] = useSearchParams()

  const filters = useMemo<RestaurantSearchParams>(() => {
    const list = (key: string) => searchParams.getAll(key).filter(Boolean)
    const rating = searchParams.get('minRating')
    const page = searchParams.get('page')

    return {
      keyword: searchParams.get('keyword') ?? undefined,
      vegetarianTypes: list('vegetarianTypes') as VegetarianType[],
      categories: list('categories'),
      tags: list('tags'),
      areas: list('areas'),
      priceRanges: list('priceRanges') as PriceRange[],
      minRating: rating ? Number(rating) : undefined,
      page: page ? Number(page) : 0,
    }
  }, [searchParams])

  /** Adds or removes one value of a multi-select filter, resetting to page 1. */
  const toggleValue = useCallback(
    (key: 'vegetarianTypes' | 'categories' | 'tags' | 'areas' | 'priceRanges', value: string) => {
      setSearchParams((current) => {
        const next = new URLSearchParams(current)
        const existing = next.getAll(key)

        next.delete(key)
        for (const item of existing) {
          if (item !== value) next.append(key, item)
        }
        if (!existing.includes(value)) next.append(key, value)

        next.delete('page')
        return next
      })
    },
    [setSearchParams],
  )

  const setKeyword = useCallback(
    (keyword: string) => {
      setSearchParams((current) => {
        const next = new URLSearchParams(current)
        if (keyword) next.set('keyword', keyword)
        else next.delete('keyword')
        next.delete('page')
        return next
      })
    },
    [setSearchParams],
  )

  const setMinRating = useCallback(
    (minRating: number | null) => {
      setSearchParams((current) => {
        const next = new URLSearchParams(current)
        if (minRating === null) next.delete('minRating')
        else next.set('minRating', String(minRating))
        next.delete('page')
        return next
      })
    },
    [setSearchParams],
  )

  const setPage = useCallback(
    (page: number) => {
      setSearchParams((current) => {
        const next = new URLSearchParams(current)
        if (page <= 0) next.delete('page')
        else next.set('page', String(page))
        return next
      })
    },
    [setSearchParams],
  )

  const clearAll = useCallback(() => setSearchParams(new URLSearchParams()), [setSearchParams])

  const activeFilterCount =
    (filters.vegetarianTypes?.length ?? 0) +
    (filters.categories?.length ?? 0) +
    (filters.tags?.length ?? 0) +
    (filters.areas?.length ?? 0) +
    (filters.priceRanges?.length ?? 0) +
    (filters.minRating ? 1 : 0)

  return { filters, toggleValue, setKeyword, setMinRating, setPage, clearAll, activeFilterCount }
}
