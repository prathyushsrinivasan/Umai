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
        <h1 className="text-2xl font-bold text-bark-800">お店を探す</h1>
        <p className="mt-1 text-sm text-bark-600">
          キーワードと条件を組み合わせて、ぴったりのお店を見つけましょう。
        </p>
      </header>

      <div className="mt-6">
        <SearchBar initialValue={filters.keyword ?? ''} onSubmit={setKeyword} />
      </div>

      <button
        type="button"
        onClick={() => setFiltersOpen((open) => !open)}
        aria-expanded={filtersOpen}
        className="mt-4 w-full cursor-pointer rounded-pill border border-cream-300 bg-white px-5 py-2.5 text-sm font-medium text-bark-600 shadow-soft transition-colors hover:border-leaf-300 lg:hidden"
      >
        絞り込み{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
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
                  className="cursor-pointer rounded-pill bg-leaf-500 px-6 py-2 font-medium text-white transition-colors hover:bg-leaf-600"
                >
                  条件をクリア
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
        className="cursor-pointer rounded-pill border border-cream-300 bg-white px-5 py-2 text-sm text-bark-600 transition-colors hover:border-leaf-300 disabled:cursor-not-allowed disabled:opacity-40"
      >
        前へ
      </button>

      <span className="text-sm text-bark-600">
        {page + 1} / {totalPages}
      </span>

      <button
        type="button"
        disabled={page >= totalPages - 1}
        onClick={() => onChange(page + 1)}
        className="cursor-pointer rounded-pill border border-cream-300 bg-white px-5 py-2 text-sm text-bark-600 transition-colors hover:border-leaf-300 disabled:cursor-not-allowed disabled:opacity-40"
      >
        次へ
      </button>
    </nav>
  )
}
