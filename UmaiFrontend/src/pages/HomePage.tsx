import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import { Link } from 'react-router-dom'

import { fetchCategories, fetchRestaurantsInBounds, searchRestaurants } from '../api/restaurants'
import { MapBoundsWatcher } from '../components/map/MapBoundsWatcher'
import { RestaurantPhoto } from '../components/restaurant/RestaurantPhoto'
import { Icon } from '../components/ui/Icon'
import { Rating } from '../components/ui/Rating'
import { EmptyState, ErrorState } from '../components/ui/States'
import { useAsync } from '../hooks/useAsync'
import { areaLabel, categoryLabel } from '../i18n/dataLabels'
import { useLanguage } from '../i18n/useLanguage'
import { useRomanized } from '../i18n/useRomanized'
import {
  OSM_ATTRIBUTION,
  OSM_TILE_URL,
  TOKYO_CENTER,
  TOKYO_DEFAULT_ZOOM,
  restaurantIcon,
  selectedRestaurantIcon,
} from '../lib/leaflet'
import { FILTERABLE_VEGETARIAN_TYPES, VEGETARIAN_TYPE_STYLES } from '../lib/labels'
import type { Category, MapBounds, RestaurantSummary, VegetarianType } from '../types/restaurant'

/** Keyword search results are capped here — plenty for a results list, no pagination UI. */
const SEARCH_RESULT_LIMIT = 60

/**
 * Home — a map-first view of live Tokyo restaurants. Everything is on one screen:
 * the map, a synchronised list, and inline filters (keyword, diet, cuisine).
 *
 * Two ways results are populated:
 * - No keyword: panning or zooming re-queries whatever's in the visible map bounds,
 *   and diet/cuisine filters narrow that set client-side.
 * - A keyword is typed: search runs against the *whole* dataset (not just the current
 *   viewport) so typing an address, ward, or restaurant name that happens to be off
 *   in a part of Tokyo the map isn't currently showing still finds it — the map then
 *   flies to fit whatever matched, so the map and list still agree.
 */
export function HomePage() {
  const { t } = useLanguage()
  const [bounds, setBounds] = useState<MapBounds | null>(null)
  const [all, setAll] = useState<RestaurantSummary[]>([])
  const [total, setTotal] = useState(0)
  const [truncated, setTruncated] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  // Filters.
  const [keyword, setKeyword] = useState('')
  const [debouncedKeyword, setDebouncedKeyword] = useState('')
  const [diet, setDiet] = useState<VegetarianType | null>(null)
  const [category, setCategory] = useState<string | null>(null)

  const loadCategories = useCallback((signal: AbortSignal) => fetchCategories(signal), [])
  const categories = useAsync(loadCategories)

  const requestRef = useRef<AbortController | null>(null)
  const handleBoundsChange = useCallback((next: MapBounds) => setBounds(next), [])

  // Debounced so every keystroke doesn't fire a request.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKeyword(keyword.trim()), 350)
    return () => clearTimeout(timer)
  }, [keyword])

  const searching = debouncedKeyword.length > 0

  // Viewport-driven load — only while there's no active keyword search.
  useEffect(() => {
    if (searching) return
    if (!bounds) return
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    setLoading(true)
    setError(null)

    fetchRestaurantsInBounds(bounds, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return
        setAll(data.restaurants)
        setTotal(data.totalInBounds)
        setTruncated(data.truncated)
        setLoading(false)
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return
        setError(cause instanceof Error ? cause : new Error(String(cause)))
        setLoading(false)
      })

    return () => controller.abort()
  }, [bounds, searching])

  // Keyword-driven load — searches every restaurant, regardless of what the map
  // happens to be showing right now.
  useEffect(() => {
    if (!searching) return
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    setLoading(true)
    setError(null)

    searchRestaurants(
      {
        keyword: debouncedKeyword,
        vegetarianTypes: diet ? [diet] : undefined,
        categories: category ? [category] : undefined,
        size: SEARCH_RESULT_LIMIT,
      },
      controller.signal,
    )
      .then((page) => {
        if (controller.signal.aborted) return
        setAll(page.content)
        setTotal(page.totalElements)
        setTruncated(page.totalElements > page.content.length)
        setLoading(false)
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return
        setError(cause instanceof Error ? cause : new Error(String(cause)))
        setLoading(false)
      })

    return () => controller.abort()
  }, [searching, debouncedKeyword, diet, category])

  // In viewport mode, diet/cuisine still need a client-side pass over what the bounds
  // returned. In search mode the backend already applied every filter, so `all` is
  // the final set.
  const restaurants = useMemo(() => {
    if (searching) return all
    return all.filter((r) => {
      if (diet && r.vegetarianType !== diet) return false
      if (category && !r.categories.some((c) => c.slug === category)) return false
      return true
    })
  }, [all, diet, category, searching])

  const activeFilters = Boolean(searching || diet || category)

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 sm:px-5">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex flex-wrap items-baseline gap-x-3 gap-y-1"
      >
        <h1 className="font-display text-2xl text-bark-800 sm:text-3xl">{t.home.title}</h1>
        <p className="text-sm text-bark-400">{t.home.subtitle}</p>
      </motion.div>

      <FilterBar
        keyword={keyword}
        onKeyword={setKeyword}
        diet={diet}
        onDiet={setDiet}
        category={category}
        onCategory={setCategory}
        categories={categories.data ?? []}
      />

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-[1fr_380px]">
        <motion.div
          initial={{ opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="hand-drawn crayon-border overflow-hidden shadow-soft"
        >
          <MapContainer
            center={TOKYO_CENTER}
            zoom={TOKYO_DEFAULT_ZOOM}
            scrollWheelZoom
            style={{ height: 'min(72vh, 680px)', width: '100%' }}
            aria-label={t.home.mapAriaLabel}
          >
            <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
            <MapBoundsWatcher onBoundsChange={handleBoundsChange} />
            <MapSearchFitter searching={searching} restaurants={restaurants} />
            {restaurants.map((restaurant) => (
              <Marker
                key={restaurant.id}
                position={[restaurant.latitude, restaurant.longitude]}
                icon={selectedId === restaurant.id ? selectedRestaurantIcon : restaurantIcon}
                title={restaurant.name}
                eventHandlers={{ click: () => setSelectedId(restaurant.id) }}
              >
                <Popup>
                  <MarkerPreview restaurant={restaurant} />
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </motion.div>

        <aside aria-label={t.home.resultsAriaLabel} className="flex flex-col">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-display text-xl text-bark-800">
              {searching ? t.home.searchResultsHeading : t.home.resultsHeading}
            </h2>
            <span className="text-sm text-bark-400">
              {loading ? t.home.updating : `${restaurants.length}${activeFilters ? ` / ${total}` : ''}`}
            </span>
          </div>

          <Link
            to="/restaurants"
            className="mt-2 inline-flex w-fit items-center gap-1 rounded-pill border border-cream-300 bg-white px-3.5 py-1.5 text-xs font-medium text-leaf-700 shadow-soft transition-colors hover:border-leaf-300 hover:bg-leaf-50"
          >
            {t.home.browseAllCta}
            <Icon name="arrow-right" className="size-3.5" />
          </Link>

          {truncated && !searching && !activeFilters && (
            <p className="mt-2 rounded-cozy bg-apricot-300/25 px-4 py-2.5 text-xs text-bark-800">
              {t.home.truncatedNotice}
            </p>
          )}

          {truncated && searching && (
            <p className="mt-2 rounded-cozy bg-apricot-300/25 px-4 py-2.5 text-xs text-bark-800">
              {t.home.truncatedSearchNotice}
            </p>
          )}

          {error && (
            <div className="mt-3">
              <ErrorState onRetry={() => setBounds((current) => (current ? { ...current } : null))} />
            </div>
          )}

          {!error && !loading && restaurants.length === 0 && (
            <div className="mt-4">
              <EmptyState
                title={searching ? t.home.noResultsSearch : activeFilters ? t.home.noResultsFiltered : t.home.noResultsInBounds}
              />
            </div>
          )}

          <ul className="mt-3 max-h-[620px] space-y-2.5 overflow-y-auto p-1.5">
            {restaurants.map((restaurant, index) => (
              <motion.li
                key={restaurant.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(index, 14) * 0.025, ease: 'easeOut' }}
              >
                <ResultRow
                  restaurant={restaurant}
                  index={index}
                  selected={selectedId === restaurant.id}
                  onSelect={() => setSelectedId(restaurant.id)}
                />
              </motion.li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  )
}

/**
 * While a keyword search is active, flies the map to fit whatever matched — search
 * results can be anywhere in Tokyo, not just the area the map already happened to be
 * showing, so without this the map and the list would silently disagree.
 */
function MapSearchFitter({ searching, restaurants }: { searching: boolean; restaurants: RestaurantSummary[] }) {
  const map = useMap()

  useEffect(() => {
    if (!searching || restaurants.length === 0) return

    const [only] = restaurants
    if (restaurants.length === 1 && only) {
      map.setView([only.latitude, only.longitude], 15)
      return
    }

    const points: [number, number][] = restaurants.map((r) => [r.latitude, r.longitude])
    map.fitBounds(points, { padding: [48, 48], maxZoom: 15 })
    // Re-fit only when the search itself changes the result set, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searching, restaurants])

  return null
}

interface FilterBarProps {
  keyword: string
  onKeyword: (value: string) => void
  diet: VegetarianType | null
  onDiet: (value: VegetarianType | null) => void
  category: string | null
  onCategory: (value: string | null) => void
  categories: Category[]
}

function FilterBar({ keyword, onKeyword, diet, onDiet, category, onCategory, categories }: FilterBarProps) {
  const { lang, t } = useLanguage()
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
      className="mt-4 space-y-3"
    >
      <div className="relative max-w-xl">
        <Icon
          name="search"
          className="pointer-events-none absolute left-4 top-1/2 size-4.5 -translate-y-1/2 text-bark-400"
        />
        <input
          type="search"
          value={keyword}
          onChange={(event) => onKeyword(event.target.value)}
          placeholder={t.home.searchPlaceholder}
          aria-label={t.home.searchAriaLabel}
          className="w-full rounded-pill border border-cream-300 bg-white py-2.5 pl-11 pr-4 text-bark-800 shadow-soft transition-colors placeholder:text-bark-400 focus:border-leaf-400 focus:outline-none focus:ring-3 focus:ring-leaf-100"
        />
      </div>

      {/* Diet chips stay front-and-centre (the primary filter); cuisine — with many
          more options — collapses into one dropdown instead of a chip each, so the
          whole bar reads as a handful of controls rather than a wall of buttons. */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterChip active={diet === null} onClick={() => onDiet(null)}>
          {t.home.all}
        </FilterChip>
        {FILTERABLE_VEGETARIAN_TYPES.map((type) => (
          <FilterChip key={type} active={diet === type} onClick={() => onDiet(diet === type ? null : type)}>
            {t.vegetarianType[type]}
          </FilterChip>
        ))}

        <select
          value={category ?? ''}
          onChange={(event) => onCategory(event.target.value || null)}
          aria-label={t.home.categoryAriaLabel}
          className="cursor-pointer rounded-pill border border-cream-300 bg-white py-1.5 pl-3.5 pr-8 text-sm text-bark-600 shadow-soft transition-colors hover:border-leaf-300 focus:border-leaf-400 focus:outline-none focus:ring-3 focus:ring-leaf-100"
        >
          <option value="">{t.home.categoryAll}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {categoryLabel(c, lang)}
            </option>
          ))}
        </select>
      </div>
    </motion.div>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className={`cursor-pointer rounded-pill border px-3.5 py-1.5 text-sm ${
        active
          ? 'border-leaf-500 bg-leaf-500 font-medium text-white'
          : 'border-cream-300 bg-white text-bark-600 hover:border-leaf-300 hover:text-leaf-700'
      }`}
    >
      {children}
    </motion.button>
  )
}

function ResultRow({
  restaurant,
  index = 0,
  selected,
  onSelect,
}: {
  restaurant: RestaurantSummary
  index?: number
  selected: boolean
  onSelect: () => void
}) {
  const { lang, t } = useLanguage()
  const name = useRomanized(restaurant.name)
  return (
    <motion.div
      whileHover={{ y: -3, rotate: index % 2 === 0 ? -0.6 : 0.6 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      className={`flex gap-3 overflow-hidden ${index % 2 === 0 ? 'hand-drawn' : 'hand-drawn-alt'} border bg-white shadow-soft transition-colors ${
        selected ? 'border-2 border-leaf-400 ring-2 ring-leaf-100' : 'border-cream-200 hover:border-leaf-300'
      }`}
    >
      <RestaurantPhoto
        imageUrl={restaurant.imageUrl}
        name={restaurant.name}
        categories={restaurant.categories}
        className="h-full w-24 shrink-0"
      />

      <div className="min-w-0 flex-1">
        <button type="button" onClick={onSelect} aria-pressed={selected} className="w-full cursor-pointer pt-3.5 pr-3.5 pb-2 text-left">
          <span className={`inline-block rounded-pill px-2.5 py-0.5 text-xs font-medium ${VEGETARIAN_TYPE_STYLES[restaurant.vegetarianType]}`}>
            {t.vegetarianType[restaurant.vegetarianType]}
          </span>
          <span className="mt-2 block truncate font-medium text-bark-800">{name}</span>
          {restaurant.area && (
            <span className="mt-1 flex items-center gap-1 text-xs text-bark-400">
              <Icon name="pin" className="size-3.5 shrink-0" />
              <span className="truncate">{areaLabel(restaurant.area, lang)}</span>
            </span>
          )}
        </button>
        <div className="flex items-center justify-between gap-2 pr-3.5 pb-3.5">
          <Rating averageRating={restaurant.averageRating} reviewCount={restaurant.reviewCount} />
          <Link
            to={`/restaurants/${restaurant.id}`}
            aria-label={`${name}${t.home.detailCta}`}
            className="flex shrink-0 items-center justify-center rounded-pill p-1.5 text-leaf-600 transition-colors hover:bg-leaf-50"
          >
            <Icon name="arrow-right" className="size-4" />
          </Link>
        </div>
      </div>
    </motion.div>
  )
}

function MarkerPreview({ restaurant }: { restaurant: RestaurantSummary }) {
  const { lang, t } = useLanguage()
  const name = useRomanized(restaurant.name)
  const address = useRomanized(restaurant.address)
  return (
    <div className="w-46 space-y-1.5">
      <RestaurantPhoto
        imageUrl={restaurant.imageUrl}
        name={restaurant.name}
        categories={restaurant.categories}
        className="hand-drawn h-20 w-full"
      />
      <span className={`inline-block rounded-pill px-2.5 py-0.5 text-xs font-medium ${VEGETARIAN_TYPE_STYLES[restaurant.vegetarianType]}`}>
        {t.vegetarianType[restaurant.vegetarianType]}
      </span>
      <p className="text-sm font-bold text-bark-800">{name}</p>
      {restaurant.categories.length > 0 && (
        <p className="text-xs text-bark-600">
          {restaurant.categories.map((c) => categoryLabel(c, lang)).join('・')}
        </p>
      )}
      <Rating averageRating={restaurant.averageRating} reviewCount={restaurant.reviewCount} />
      {address && <p className="text-xs text-bark-400">{address}</p>}
      <Link
        to={`/restaurants/${restaurant.id}`}
        className="mt-1 inline-flex items-center gap-1 rounded-pill bg-leaf-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-leaf-600"
      >
        {t.home.detailCta}
        <Icon name="arrow-right" className="size-3.5" />
      </Link>
    </div>
  )
}
