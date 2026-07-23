import { useCallback, useState } from 'react'

import { searchRestaurants } from '../api/restaurants'
import { RestaurantCard } from '../components/restaurant/RestaurantCard'
import { RestaurantFilters } from '../components/restaurant/RestaurantFilters'
import { SearchBar } from '../components/ui/SearchBar'
import { CardSkeletonGrid, EmptyState, ErrorState } from '../components/ui/States'
import { useAsync } from '../hooks/useAsync'
import { useRestaurantFilters } from '../hooks/useRestaurantFilters'

const PAGE_SIZE = 12

/** お店を探す — keyword search plus filters, with results in a card grid. */
export function SearchPage() {
  const { filters, toggleValue, setKeyword, setMinRating, setPage, clearAll, activeFilterCount } =
    useRestaurantFilters()
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Serialised so the request identity changes only when the filters really change.
  const filterKey = JSON.stringify(filters)
  const loadResults = useCallback(
    (signal: AbortSignal) => searchRestaurants({ ...filters, size: PAGE_SIZE }, signal),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filterKey],
  )

  const results = useAsync(loadResults)

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <header>
        <h1 className="font-display text-3xl text-bark-800">お店を探す</h1>
      </header>

      <div className="mt-6">
        <SearchBar initialValue={filters.keyword ?? ''} onSubmit={setKeyword} />
      </div>

      <button
        type="button"
        onClick={() => setFiltersOpen((open) => !open)}
        aria-expanded={filtersOpen}
        aria-label={`絞り込み${activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}`}
        className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-pill border border-cream-300 bg-white px-5 py-2.5 text-sm font-medium text-bark-600 shadow-soft transition-colors hover:border-leaf-300 lg:hidden"
      >
        <FunnelIcon />
        {activeFilterCount > 0 && (
          <span className="rounded-pill bg-leaf-500 px-2 py-0.5 text-xs text-white">{activeFilterCount}</span>
        )}
      </button>

      <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
        {/*
          One instance, shown or hidden with CSS: always visible on desktop,
          toggled on mobile. Rendering a second copy for the mobile layout would
          duplicate the category/area/tag requests whenever both were mounted.
        */}
        <aside className={`${filtersOpen ? 'block' : 'hidden'} lg:block`}>
          <div className="lg:sticky lg:top-24">
            <RestaurantFilters
              filters={filters}
              onToggle={toggleValue}
              onMinRatingChange={setMinRating}
              onClear={clearAll}
              activeFilterCount={activeFilterCount}
            />
          </div>
        </aside>

        <section aria-label="検索結果">
          {results.loading && <CardSkeletonGrid count={6} />}

          {results.error && <ErrorState onRetry={results.reload} />}

          {results.data && results.data.totalElements === 0 && (
            <EmptyState>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  aria-label="条件をクリア"
                  className="sketchy-edge inline-flex cursor-pointer items-center justify-center rounded-pill bg-leaf-500 p-3 text-white transition-colors hover:bg-leaf-600"
                >
                  <XIcon />
                </button>
              )}
            </EmptyState>
          )}

          {results.data && results.data.totalElements > 0 && (
            <>
              <p className="mb-4 text-sm text-bark-600">
                <span className="font-semibold text-bark-800">{results.data.totalElements}</span> 件のお店
              </p>

              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {results.data.content.map((restaurant, index) => (
                  <RestaurantCard key={restaurant.id} restaurant={restaurant} index={index} />
                ))}
              </div>

              <Pagination
                page={results.data.page}
                totalPages={results.data.totalPages}
                onChange={setPage}
              />
            </>
          )}
        </section>
      </div>
    </div>
  )
}

interface PaginationProps {
  page: number
  totalPages: number
  onChange: (page: number) => void
}

function Pagination({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <nav aria-label="ページ送り" className="mt-10 flex items-center justify-center gap-3">
      <button
        type="button"
        disabled={page === 0}
        onClick={() => onChange(page - 1)}
        aria-label="前へ"
        className="flex cursor-pointer items-center justify-center rounded-pill border border-cream-300 bg-white p-2.5 text-bark-600 transition-colors hover:border-leaf-300 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronIcon direction="left" />
      </button>

      <span className="text-sm text-bark-600">
        {page + 1} / {totalPages}
      </span>

      <button
        type="button"
        disabled={page >= totalPages - 1}
        onClick={() => onChange(page + 1)}
        aria-label="次へ"
        className="flex cursor-pointer items-center justify-center rounded-pill border border-cream-300 bg-white p-2.5 text-bark-600 transition-colors hover:border-leaf-300 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronIcon direction="right" />
      </button>
    </nav>
  )
}

function FunnelIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-4">
      <path d="M4 6h16M7 12h10M10.5 18h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-4">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

function ChevronIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-4">
      <path
        d={direction === 'left' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'}
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
