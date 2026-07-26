import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'
import type { Marker as LeafletMarker } from 'leaflet'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import { Link } from 'react-router-dom'

import { fetchCategories, fetchRestaurantsInBounds, searchRestaurants } from '../api/restaurants'
import { MapBoundsWatcher } from '../components/map/MapBoundsWatcher'
import { RestaurantPhoto } from '../components/restaurant/RestaurantPhoto'
import { Icon } from '../components/ui/Icon'
import { Mascot } from '../components/ui/Mascot'
import { Rating } from '../components/ui/Rating'
import { EmptyState, ErrorState } from '../components/ui/States'
import { useAsync } from '../hooks/useAsync'
import { groupByName } from '../lib/chains'
import { matchKnownPlace } from '../lib/places'
import { areaLabel, categoryLabel } from '../i18n/dataLabels'
import { useLanguage } from '../i18n/useLanguage'
import { useRomanized } from '../i18n/useRomanized'
import {
  OSM_ATTRIBUTION,
  OSM_TILE_URL,
  TOKYO_CENTER,
  TOKYO_DEFAULT_ZOOM,
  VEGETARIAN_PIN_COLORS,
  markerIcon,
} from '../lib/leaflet'
import { FILTERABLE_VEGETARIAN_TYPES, VEGETARIAN_TYPE_STYLES } from '../lib/labels'
import type { Category, MapBounds, RestaurantSummary, VegetarianType } from '../types/restaurant'

/** Keyword search results are capped here — plenty for a results list, no pagination UI. */
const SEARCH_RESULT_LIMIT = 60

/** Zoom used when focusing a single restaurant from the list or a marker click. */
const FOCUS_ZOOM = 16

/** Pixels to drop the focused pin below centre, leaving room for its popup above it. */
const POPUP_OFFSET = 120

/**
 * Home — a map-first view of live Tokyo restaurants. Everything is on one screen:
 * the map, a synchronised list, and inline filters (keyword, diet, cuisine).
 *
 * Three ways results are populated:
 * - No keyword: panning or zooming re-queries whatever's in the visible map bounds,
 *   and diet/cuisine filters narrow that set client-side.
 * - A neighbourhood name (e.g. 秋葉原): the map flies there and viewport mode takes over,
 *   so you see everything in that area — not just places with the word in their name.
 * - Any other keyword: search runs against the *whole* dataset and the map flies to fit
 *   the matches, so the map and list always agree.
 */
export function HomePage() {
  const { t } = useLanguage()
  const markerRefs = useRef(new Map<number, LeafletMarker>())
  const [flyTarget, setFlyTarget] = useState<FlyTarget | null>(null)
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

  // Selecting a restaurant (from the list or a marker) centres the map on it and opens
  // its popup, so the list and the map always agree about what you're looking at. The
  // fly itself is done by <MapFlyer> (which holds the live map via useMap); we just set
  // the target. `offset` drops the pin below centre so the popup above it fits.
  const focusRestaurant = useCallback((restaurant: RestaurantSummary) => {
    setSelectedId(restaurant.id)
    markerRefs.current.get(restaurant.id)?.openPopup()
    setFlyTarget({ lat: restaurant.latitude, lng: restaurant.longitude, zoom: FOCUS_ZOOM, offset: true })
  }, [])

  // The reset control: back to all of Tokyo, filters cleared.
  const resetView = useCallback(() => {
    setKeyword('')
    setDiet(null)
    setCategory(null)
    setSelectedId(null)
    setFlyTarget({ lat: TOKYO_CENTER[0], lng: TOKYO_CENTER[1], zoom: TOKYO_DEFAULT_ZOOM })
  }, [])

  // Debounced so every keystroke doesn't fire a request.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKeyword(keyword.trim()), 350)
    return () => clearTimeout(timer)
  }, [keyword])

  // A neighbourhood name flies the map there; viewport mode then loads that area.
  const geoPlace = useMemo(() => matchKnownPlace(debouncedKeyword), [debouncedKeyword])
  useEffect(() => {
    if (geoPlace) setFlyTarget({ lat: geoPlace.center[0], lng: geoPlace.center[1], zoom: geoPlace.zoom })
  }, [geoPlace])

  const searching = debouncedKeyword.length > 0 && !geoPlace

  // Viewport-driven load — while there's no active keyword search (a neighbourhood match
  // counts as viewport mode, since it just moves the map).
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

  // Chains (same name, many branches) collapse to one entry in the list; the map still
  // shows every branch as its own pin.
  const groups = useMemo(() => groupByName(restaurants), [restaurants])

  const activeFilters = Boolean(searching || diet || category)

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 sm:px-5">
      <motion.h1
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex items-center gap-2 font-display text-2xl text-bark-800 sm:text-3xl"
      >
        <Mascot mood="happy" size={40} className="shrink-0 -rotate-6" />
        {t.home.title}
      </motion.h1>

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
          className="hand-drawn crayon-frame relative shadow-soft"
        >
          <div className="hand-drawn relative overflow-hidden">
            <MapContainer
              center={TOKYO_CENTER}
              zoom={TOKYO_DEFAULT_ZOOM}
              scrollWheelZoom
              style={{ height: 'min(72vh, 680px)', width: '100%' }}
              aria-label={t.home.mapAriaLabel}
            >
              <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
              <MapFlyer target={flyTarget} />
              <MapBoundsWatcher onBoundsChange={handleBoundsChange} />
              <MapSearchFitter searching={searching} restaurants={restaurants} />
              {restaurants.map((restaurant) => (
                <Marker
                  key={restaurant.id}
                  ref={(instance) => {
                    if (instance) markerRefs.current.set(restaurant.id, instance)
                    else markerRefs.current.delete(restaurant.id)
                  }}
                  position={[restaurant.latitude, restaurant.longitude]}
                  icon={markerIcon(restaurant.vegetarianType, selectedId === restaurant.id)}
                  title={restaurant.name}
                  eventHandlers={{ click: () => focusRestaurant(restaurant) }}
                >
                  <Popup autoPan={false}>
                    <MarkerPreview restaurant={restaurant} />
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          {/* Reset back to all of Tokyo — overlaid on the map, top-right. */}
          <motion.button
            type="button"
            onClick={resetView}
            whileHover={{ y: -1, rotate: -1 }}
            whileTap={{ scale: 0.94 }}
            className="hand-drawn absolute right-4 top-4 z-[1000] flex items-center gap-1.5 border-2 border-bark-400 bg-cream-50 px-3 py-1.5 text-sm font-display text-bark-800 shadow-soft"
          >
            <Icon name="map" className="size-4 text-leaf-600" />
            {t.home.resetMap}
          </motion.button>
        </motion.div>

        <aside aria-label={t.home.resultsAriaLabel} className="flex flex-col">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-display text-xl text-bark-800">
              {searching ? t.home.searchResultsHeading : t.home.resultsHeading}
            </h2>
            <span className="text-sm text-bark-400">
              {loading ? t.home.updating : `${groups.length}${activeFilters ? ` / ${total}` : ''}`}
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

          {error && (
            <div className="mt-3">
              <ErrorState onRetry={() => setBounds((current) => (current ? { ...current } : null))} />
            </div>
          )}

          {!error && !loading && groups.length === 0 && (
            <div className="mt-4">
              <EmptyState
                title={searching ? t.home.noResultsSearch : activeFilters ? t.home.noResultsFiltered : t.home.noResultsInBounds}
              />
            </div>
          )}

          <ul className="mt-3 max-h-[620px] space-y-3 overflow-y-auto p-1.5">
            {groups.map((group, index) => (
              <motion.li
                key={group.representative.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(index, 14) * 0.025, ease: 'easeOut' }}
              >
                <ResultRow
                  restaurant={group.representative}
                  branchCount={group.members.length}
                  index={index}
                  selected={group.members.some((m) => m.id === selectedId)}
                  onSelect={() => focusRestaurant(group.representative)}
                />
              </motion.li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  )
}

/** Where the map should fly next. A fresh object each time re-triggers the fly. */
interface FlyTarget {
  lat: number
  lng: number
  zoom: number
  /** Drop the point below centre, leaving room above for a popup. */
  offset?: boolean
}

/**
 * Flies the map whenever `target` changes. Uses `useMap`, so it always drives the live
 * map instance — lifting the map into page state instead goes stale across this
 * react-leaflet version's remounts, silently no-oping every fly.
 */
function MapFlyer({ target }: { target: FlyTarget | null }) {
  const map = useMap()
  useEffect(() => {
    if (!target) return
    // setView, not flyTo: an instant move is what item 4 wants (no lag, no re-adjustment),
    // and the offset drops the pin below centre so its popup fits above without a re-pan.
    if (target.offset) {
      const point = map.project([target.lat, target.lng], target.zoom).subtract([0, POPUP_OFFSET])
      map.setView(map.unproject(point, target.zoom), target.zoom)
    } else {
      map.setView([target.lat, target.lng], target.zoom)
    }
  }, [target, map])
  return null
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

      {/* Diet chips carry the pin colour as a dot, so they double as the map's legend —
          no separate key needed. Cuisine collapses into one dropdown, so the whole bar
          reads as a handful of controls rather than a wall of buttons. */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterChip active={diet === null} onClick={() => onDiet(null)}>
          {t.home.all}
        </FilterChip>
        {FILTERABLE_VEGETARIAN_TYPES.map((type) => (
          <FilterChip
            key={type}
            active={diet === type}
            dotColor={VEGETARIAN_PIN_COLORS[type]}
            onClick={() => onDiet(diet === type ? null : type)}
          >
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
  dotColor,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  dotColor?: string
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className={`flex cursor-pointer items-center gap-1.5 rounded-pill border px-3.5 py-1.5 text-sm ${
        active
          ? 'border-leaf-500 bg-leaf-500 font-medium text-white'
          : 'border-cream-300 bg-white text-bark-600 hover:border-leaf-300 hover:text-leaf-700'
      }`}
    >
      {dotColor && (
        <span
          aria-hidden="true"
          className="size-2.5 rounded-full ring-2 ring-white/60"
          style={{ backgroundColor: dotColor }}
        />
      )}
      {children}
    </motion.button>
  )
}

function ResultRow({
  restaurant,
  branchCount,
  index = 0,
  selected,
  onSelect,
}: {
  restaurant: RestaurantSummary
  branchCount: number
  index?: number
  selected: boolean
  onSelect: () => void
}) {
  const { lang, t } = useLanguage()
  const name = useRomanized(restaurant.name)
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      whileHover={{ y: -3, rotate: index % 2 === 0 ? -0.6 : 0.6 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      className={`flex w-full gap-3 overflow-hidden p-2.5 text-left ${index % 2 === 0 ? 'hand-drawn' : 'hand-drawn-alt'} border-2 bg-white shadow-soft transition-colors ${
        selected ? 'border-leaf-400 ring-2 ring-leaf-100' : 'border-cream-200 hover:border-leaf-300'
      }`}
    >
      <RestaurantPhoto
        imageUrl={restaurant.imageUrl}
        name={restaurant.name}
        categories={restaurant.categories}
        className="hand-drawn size-24 shrink-0"
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`inline-block w-fit rounded-pill px-2.5 py-0.5 text-xs font-medium ${VEGETARIAN_TYPE_STYLES[restaurant.vegetarianType]}`}>
            {t.vegetarianType[restaurant.vegetarianType]}
          </span>
          {branchCount > 1 && (
            <span className="rounded-pill bg-apricot-300/40 px-2 py-0.5 text-[11px] font-medium text-bark-600">
              {t.home.branches(branchCount)}
            </span>
          )}
        </div>
        <span className="mt-1.5 block truncate font-display text-[15px] text-bark-800">{name}</span>
        {restaurant.area && (
          <span className="mt-1 flex items-center gap-1 text-xs text-bark-400">
            <Icon name="pin" className="size-3.5 shrink-0" />
            <span className="truncate">{areaLabel(restaurant.area, lang)}</span>
          </span>
        )}
        <div className="mt-auto flex items-center justify-between gap-2 pt-1.5">
          <Rating
            averageRating={restaurant.averageRating}
            reviewCount={restaurant.reviewCount}
            googleRating={restaurant.googleRating}
            googleRatingCount={restaurant.googleRatingCount}
          />
          <Link
            to={`/restaurants/${restaurant.id}`}
            onClick={(event) => event.stopPropagation()}
            aria-label={`${name}${t.home.detailCta}`}
            className="flex shrink-0 items-center gap-1 rounded-pill bg-leaf-50 px-2.5 py-1 text-xs font-medium text-leaf-700 transition-colors hover:bg-leaf-100"
          >
            {t.home.detailCta}
            <Icon name="arrow-right" className="size-3.5" />
          </Link>
        </div>
      </div>
    </motion.button>
  )
}

function MarkerPreview({ restaurant }: { restaurant: RestaurantSummary }) {
  const { lang, t } = useLanguage()
  const name = useRomanized(restaurant.name)
  return (
    <div className="w-48 space-y-2">
      <div className="hand-drawn relative overflow-hidden">
        <RestaurantPhoto
          imageUrl={restaurant.imageUrl}
          name={restaurant.name}
          categories={restaurant.categories}
          className="h-24 w-full"
        />
        <span className={`absolute left-1.5 top-1.5 rounded-pill px-2 py-0.5 text-[11px] font-medium shadow-soft ${VEGETARIAN_TYPE_STYLES[restaurant.vegetarianType]}`}>
          {t.vegetarianType[restaurant.vegetarianType]}
        </span>
      </div>

      <div className="flex items-start gap-1.5">
        <Mascot mood="happy" size={26} className="mt-0.5 shrink-0 -rotate-6" />
        <p className="font-display text-[15px] leading-snug text-bark-800">{name}</p>
      </div>

      {restaurant.categories.length > 0 && (
        <p className="text-xs text-bark-600">
          {restaurant.categories.map((c) => categoryLabel(c, lang)).join('・')}
        </p>
      )}
      <Rating
        averageRating={restaurant.averageRating}
        reviewCount={restaurant.reviewCount}
        googleRating={restaurant.googleRating}
        googleRatingCount={restaurant.googleRatingCount}
      />

      <Link
        to={`/restaurants/${restaurant.id}`}
        className="flex items-center justify-center gap-1 rounded-pill bg-apricot-300 px-4 py-2 text-sm font-medium text-bark-800 shadow-soft transition-colors hover:bg-apricot-500 hover:text-white"
      >
        {t.home.markerCta}
        <Icon name="arrow-right" className="size-4" />
      </Link>
    </div>
  )
}
