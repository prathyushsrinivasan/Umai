import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { SetStateAction } from 'react'

import { fetchAreas, fetchCategories, searchRestaurants } from '../api/restaurants'
import { RestaurantPhoto } from '../components/restaurant/RestaurantPhoto'
import { Chip } from '../components/ui/Chip'
import { Icon } from '../components/ui/Icon'
import { Rating } from '../components/ui/Rating'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States'
import { useAsync } from '../hooks/useAsync'
import { areaLabel, categoryLabel } from '../i18n/dataLabels'
import { useLanguage } from '../i18n/useLanguage'
import { useRomanized } from '../i18n/useRomanized'
import { FILTERABLE_VEGETARIAN_TYPES, PRICE_RANGES, VEGETARIAN_TYPE_STYLES } from '../lib/labels'
import type { PriceRange, RestaurantSummary, VegetarianType } from '../types/restaurant'

const PAGE_SIZE = 24
// The server groups matching branches before paginating.
const FETCH_LIMIT = PAGE_SIZE
const RATING_OPTIONS = [4, 4.5] as const

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
}

/**
 * The full browse experience: every restaurant, filterable and paginated, for anyone
 * who wants to dig further than the home map's "what's currently on screen" view.
 */
export function RestaurantsPage() {
  const { lang, t } = useLanguage()

  const [params, setParams] = useSearchParams()
  const debouncedKeyword = params.get('keyword') ?? ''
  const [keyword, setKeyword] = useState(debouncedKeyword)
  const dietTypes = useMemo(() => params.getAll('vegetarianTypes').filter((value): value is VegetarianType => FILTERABLE_VEGETARIAN_TYPES.includes(value as VegetarianType)), [params])
  const categorySlugs = useMemo(() => params.getAll('categories'), [params])
  const areaSlugs = useMemo(() => params.getAll('areas'), [params])
  const priceRanges = useMemo(() => params.getAll('priceRanges').filter((value): value is PriceRange => PRICE_RANGES.includes(value as PriceRange)), [params])
  const rating = Number(params.get('minRating'))
  const minRating = rating >= 1 && rating <= 5 ? rating : null
  const rawPage = Number(params.get('page'))
  const page = Number.isInteger(rawPage) && rawPage >= 0 && rawPage <= 100_000 ? rawPage : 0

  useEffect(() => setKeyword(debouncedKeyword), [debouncedKeyword])
  useEffect(() => {
    if (keyword.trim() === debouncedKeyword) return
    const timer = setTimeout(() => setParams(current => {
      const next = new URLSearchParams(current)
      if (keyword.trim()) next.set('keyword', keyword.trim()); else next.delete('keyword')
      next.delete('page')
      return next
    }, { replace: true }), 350)
    return () => clearTimeout(timer)
  }, [keyword, debouncedKeyword, setParams])

  function setList<T extends string>(key: string, change: SetStateAction<T[]>) {
    setParams(current => {
      const next = new URLSearchParams(current)
      const values = typeof change === 'function' ? change(current.getAll(key) as T[]) : change
      next.delete(key); next.delete('page')
      values.forEach(value => next.append(key, value))
      return next
    })
  }
  const setDietTypes = (value: SetStateAction<VegetarianType[]>) => setList('vegetarianTypes', value)
  const setCategorySlugs = (value: SetStateAction<string[]>) => setList('categories', value)
  const setAreaSlugs = (value: SetStateAction<string[]>) => setList('areas', value)
  const setPriceRanges = (value: SetStateAction<PriceRange[]>) => setList('priceRanges', value)
  function setMinRating(value: number | null) {
    setParams(current => { const next = new URLSearchParams(current); next.delete('page'); if (value === null) next.delete('minRating'); else next.set('minRating', String(value)); return next })
  }
  function setPage(change: SetStateAction<number>) {
    setParams(current => { const next = new URLSearchParams(current); const value = typeof change === 'function' ? change(page) : change; next.set('page', String(value)); return next })
  }

  const loadCategories = useCallback((signal: AbortSignal) => fetchCategories(signal), [])
  const categories = useAsync(loadCategories)
  const loadAreas = useCallback((signal: AbortSignal) => fetchAreas(signal), [])
  const areas = useAsync(loadAreas)

  const loadResults = useCallback(
    (signal: AbortSignal) =>
      searchRestaurants(
        {
          keyword: debouncedKeyword || undefined,
          vegetarianTypes: dietTypes.length ? dietTypes : undefined,
          categories: categorySlugs.length ? categorySlugs : undefined,
          areas: areaSlugs.length ? areaSlugs : undefined,
          priceRanges: priceRanges.length ? priceRanges : undefined,
          minRating: minRating ?? undefined,
          size: FETCH_LIMIT,
          page,
          groupByName: true,
        },
        signal,
      ),
    [debouncedKeyword, dietTypes, categorySlugs, areaSlugs, priceRanges, minRating, page],
  )
  const results = useAsync(loadResults)

  // Each item represents a chain group already selected and counted by the server.
  const groups = useMemo(() => (results.data?.content ?? []).map((restaurant) => ({
    representative: restaurant, branchCount: restaurant.branchCount ?? 1,
  })), [results.data])
  const totalPages = Math.max(1, results.data?.totalPages ?? 1)
  const pageGroups = groups

  const hasActiveFilters = Boolean(
    debouncedKeyword || dietTypes.length || categorySlugs.length || areaSlugs.length || priceRanges.length || minRating,
  )

  function clearFilters() { setKeyword(''); setParams({}) }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-5">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-bark-400 transition-colors hover:text-leaf-600"
      >
        <Icon name="arrow-right" className="size-3.5 rotate-180" />
        {t.browsePage.backToMap}
      </Link>

      <header className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="font-display text-2xl text-bark-800 sm:text-3xl">{t.browsePage.title}</h1>
        <p className="text-sm text-bark-400">{t.browsePage.subtitle}</p>
      </header>

      <div className="mt-5 space-y-4 rounded-cozy border border-cream-200 bg-white p-4 shadow-soft sm:p-5">
        <div className="relative max-w-xl">
          <Icon
            name="search"
            className="pointer-events-none absolute left-4 top-1/2 size-4.5 -translate-y-1/2 text-bark-400"
          />
          <input
            type="search"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder={t.browsePage.searchPlaceholder}
            aria-label={t.browsePage.searchAriaLabel}
            className="w-full rounded-pill border border-cream-300 bg-white py-2.5 pl-11 pr-4 text-bark-800 transition-colors placeholder:text-bark-400 focus:border-leaf-400 focus:outline-none focus:ring-3 focus:ring-leaf-100"
          />
        </div>

        <FilterGroup heading={t.browsePage.dietHeading}>
          {FILTERABLE_VEGETARIAN_TYPES.map((type) => (
            <Chip
              key={type}
              label={t.vegetarianType[type]}
              selected={dietTypes.includes(type)}
              onClick={() => setDietTypes((current) => toggle(current, type))}
            />
          ))}
        </FilterGroup>

        {categories.data && categories.data.length > 0 && (
          <FilterGroup heading={t.browsePage.categoryHeading}>
            {categories.data.map((c) => (
              <Chip
                key={c.id}
                label={categoryLabel(c, lang)}
                selected={categorySlugs.includes(c.slug)}
                onClick={() => setCategorySlugs((current) => toggle(current, c.slug))}
              />
            ))}
          </FilterGroup>
        )}

        {areas.data && areas.data.length > 0 && (
          <FilterGroup heading={t.browsePage.areaHeading}>
            {areas.data.map((a) => (
              <Chip
                key={a.id}
                label={areaLabel(a, lang)}
                selected={areaSlugs.includes(a.slug)}
                onClick={() => setAreaSlugs((current) => toggle(current, a.slug))}
              />
            ))}
          </FilterGroup>
        )}

        <FilterGroup heading={t.browsePage.priceHeading}>
          {PRICE_RANGES.map((range) => (
            <Chip
              key={range}
              label={t.priceRange[range]}
              selected={priceRanges.includes(range)}
              onClick={() => setPriceRanges((current) => toggle(current, range))}
            />
          ))}
        </FilterGroup>

        <FilterGroup heading={t.browsePage.ratingHeading}>
          <Chip label={t.browsePage.ratingAny} selected={minRating === null} onClick={() => setMinRating(null)} />
          {RATING_OPTIONS.map((stars) => (
            <Chip
              key={stars}
              label={t.browsePage.ratingAtLeast(stars)}
              selected={minRating === stars}
              onClick={() => setMinRating(stars)}
            />
          ))}
        </FilterGroup>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="cursor-pointer text-sm text-bark-400 underline-offset-2 hover:text-berry-500 hover:underline"
          >
            {t.browsePage.clearFilters}
          </button>
        )}
      </div>

      <div className="mt-6">
        {results.loading && <LoadingState />}
        {results.error && <ErrorState onRetry={results.reload} />}

        {results.data && !results.loading && !results.error && (
          <>
            <p className="text-sm text-bark-400">{t.browsePage.resultCount(results.data.totalElements)}</p>

            {pageGroups.length === 0 ? (
              <div className="mt-4">
                <EmptyState title={t.browsePage.noResults} />
              </div>
            ) : (
              <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pageGroups.map((group) => (
                  <li key={group.representative.id}>
                    <BrowseCard restaurant={group.representative} branchCount={group.branchCount} />
                  </li>
                ))}
              </ul>
            )}

            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-4">
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => setPage((current) => current - 1)}
                  className="cursor-pointer rounded-pill border border-cream-300 bg-white px-4 py-2 text-sm text-bark-600 transition-colors hover:border-leaf-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t.browsePage.previous}
                </button>
                <span className="text-sm text-bark-400">
                  {t.browsePage.pageOf(page + 1, totalPages)}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((current) => current + 1)}
                  className="cursor-pointer rounded-pill border border-cream-300 bg-white px-4 py-2 text-sm text-bark-600 transition-colors hover:border-leaf-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t.browsePage.next}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function FilterGroup({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xs font-medium uppercase tracking-wide text-bark-400">{heading}</h2>
      <div className="mt-1.5 flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}

function BrowseCard({ restaurant, branchCount }: { restaurant: RestaurantSummary; branchCount: number }) {
  const { lang, t } = useLanguage()
  const name = useRomanized(restaurant.name)

  return (
    <Link
      to={`/restaurants/${restaurant.id}`}
      className="hand-drawn crayon-border flex h-full flex-col overflow-hidden border border-cream-200 bg-white shadow-soft transition-colors hover:border-leaf-300"
    >
      <RestaurantPhoto
        imageUrl={restaurant.imageUrl}
        name={restaurant.name}
        categories={restaurant.categories}
        className="h-36 w-full"
      />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`inline-block w-fit rounded-pill px-2.5 py-0.5 text-xs font-medium ${VEGETARIAN_TYPE_STYLES[restaurant.vegetarianType]}`}
          >
            {t.vegetarianType[restaurant.vegetarianType]}
          </span>
          {branchCount > 1 && (
            <span className="rounded-pill bg-apricot-300/40 px-2 py-0.5 text-[11px] font-medium text-bark-600">
              {t.home.branches(branchCount)}
            </span>
          )}
        </div>
        <span className="font-display text-bark-800">{name}</span>
        {restaurant.area && (
          <span className="flex items-center gap-1 text-xs text-bark-400">
            <Icon name="pin" className="size-3.5 shrink-0" />
            {areaLabel(restaurant.area, lang)}
          </span>
        )}
        {restaurant.categories.length > 0 && (
          <span className="text-xs text-bark-600">
            {restaurant.categories.map((c) => categoryLabel(c, lang)).join('・')}
          </span>
        )}
        <div className="mt-auto pt-1">
          <Rating
            averageRating={restaurant.averageRating}
            reviewCount={restaurant.reviewCount}
            googleRating={restaurant.googleRating}
            googleRatingCount={restaurant.googleRatingCount}
          />
        </div>
      </div>
    </Link>
  )
}
