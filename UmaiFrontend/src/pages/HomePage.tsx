import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import { Link } from 'react-router-dom'

import { fetchCategories, fetchRestaurantsInBounds } from '../api/restaurants'
import { MapBoundsWatcher } from '../components/map/MapBoundsWatcher'
import { Icon } from '../components/ui/Icon'
import { Rating } from '../components/ui/Rating'
import { ErrorState } from '../components/ui/States'
import { useAsync } from '../hooks/useAsync'
import {
  OSM_ATTRIBUTION,
  OSM_TILE_URL,
  TOKYO_CENTER,
  TOKYO_DEFAULT_ZOOM,
  restaurantIcon,
  selectedRestaurantIcon,
} from '../lib/leaflet'
import { FILTERABLE_VEGETARIAN_TYPES, VEGETARIAN_TYPE_LABELS, VEGETARIAN_TYPE_STYLES } from '../lib/labels'
import type { Category, MapBounds, RestaurantSummary, VegetarianType } from '../types/restaurant'

/**
 * Home — a map-first view of live Tokyo restaurants. Everything is on one screen:
 * the map, a synchronised list, and inline filters (keyword, diet, cuisine). Panning
 * or zooming re-queries the visible bounds; filters narrow the result client-side so
 * the map and list always agree.
 */
export function HomePage() {
  const [bounds, setBounds] = useState<MapBounds | null>(null)
  const [all, setAll] = useState<RestaurantSummary[]>([])
  const [total, setTotal] = useState(0)
  const [truncated, setTruncated] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  // Filters.
  const [keyword, setKeyword] = useState('')
  const [diet, setDiet] = useState<VegetarianType | null>(null)
  const [category, setCategory] = useState<string | null>(null)

  const loadCategories = useCallback((signal: AbortSignal) => fetchCategories(signal), [])
  const categories = useAsync(loadCategories)

  const requestRef = useRef<AbortController | null>(null)
  const handleBoundsChange = useCallback((next: MapBounds) => setBounds(next), [])

  useEffect(() => {
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
  }, [bounds])

  // Filtering is client-side over what the visible bounds returned: fast, and it keeps
  // the map markers and the list showing exactly the same set.
  const restaurants = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    return all.filter((r) => {
      if (diet && r.vegetarianType !== diet) return false
      if (category && !r.categories.some((c) => c.slug === category)) return false
      if (kw) {
        const haystack = `${r.name} ${r.description ?? ''} ${r.address ?? ''}`.toLowerCase()
        if (!haystack.includes(kw)) return false
      }
      return true
    })
  }, [all, keyword, diet, category])

  const activeFilters = Boolean(keyword.trim() || diet || category)

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 sm:px-5">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex flex-wrap items-baseline gap-x-3 gap-y-1"
      >
        <h1 className="font-display text-2xl text-bark-800 sm:text-3xl">東京のベジ・ヴィーガンを地図で</h1>
        <p className="text-sm text-bark-400">地図を動かすと、その範囲のお店が一覧に出ます</p>
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

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_380px]">
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
            aria-label="東京のレストラン地図"
          >
            <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
            <MapBoundsWatcher onBoundsChange={handleBoundsChange} />
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

        <aside aria-label="表示範囲内のお店" className="flex flex-col">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-display text-xl text-bark-800">この範囲のお店</h2>
            <span className="text-sm text-bark-400">
              {loading ? '更新中…' : `${restaurants.length}件${activeFilters ? ` / ${total}` : ''}`}
            </span>
          </div>

          {truncated && !activeFilters && (
            <p className="mt-2 rounded-cozy bg-apricot-300/25 px-4 py-2.5 text-xs text-bark-800">
              一部のみ表示しています（拡大で絞り込み）
            </p>
          )}

          {error && (
            <div className="mt-3">
              <ErrorState onRetry={() => setBounds((current) => (current ? { ...current } : null))} />
            </div>
          )}

          {!error && !loading && restaurants.length === 0 && (
            <p className="mt-4 rounded-cozy border border-cream-200 bg-white p-6 text-center text-sm text-bark-600 shadow-soft">
              {activeFilters ? '条件に合うお店が範囲内にありません' : 'この範囲にお店が見つかりませんでした'}
            </p>
          )}

          <ul className="mt-3 max-h-[620px] space-y-2.5 overflow-y-auto pr-1">
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
          placeholder="店名・料理・エリアで絞り込む"
          aria-label="キーワードで絞り込む"
          className="w-full rounded-pill border border-cream-300 bg-white py-2.5 pl-11 pr-4 text-bark-800 shadow-soft transition-colors placeholder:text-bark-400 focus:border-leaf-400 focus:outline-none focus:ring-3 focus:ring-leaf-100"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip active={diet === null && category === null} onClick={() => { onDiet(null); onCategory(null) }}>
          すべて
        </FilterChip>
        {FILTERABLE_VEGETARIAN_TYPES.map((type) => (
          <FilterChip key={type} active={diet === type} onClick={() => onDiet(diet === type ? null : type)}>
            {VEGETARIAN_TYPE_LABELS[type]}
          </FilterChip>
        ))}
        <span aria-hidden="true" className="mx-1 w-px self-stretch bg-cream-300" />
        {categories.map((c) => (
          <FilterChip key={c.id} active={category === c.slug} onClick={() => onCategory(category === c.slug ? null : c.slug)}>
            {c.nameJa}
          </FilterChip>
        ))}
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
  return (
    <motion.div
      whileHover={{ y: -3, rotate: index % 2 === 0 ? -0.6 : 0.6 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      className={`${index % 2 === 0 ? 'hand-drawn' : 'hand-drawn-alt'} border bg-white shadow-soft transition-colors ${
        selected ? 'border-2 border-leaf-400 ring-2 ring-leaf-100' : 'border-cream-200 hover:border-leaf-300'
      }`}
    >
      <button type="button" onClick={onSelect} aria-pressed={selected} className="w-full cursor-pointer p-3.5 pb-2 text-left">
        <span className={`inline-block rounded-pill px-2.5 py-0.5 text-xs font-medium ${VEGETARIAN_TYPE_STYLES[restaurant.vegetarianType]}`}>
          {VEGETARIAN_TYPE_LABELS[restaurant.vegetarianType]}
        </span>
        <span className="mt-2 block font-medium text-bark-800">{restaurant.name}</span>
        {restaurant.area && (
          <span className="mt-1 flex items-center gap-1 text-xs text-bark-400">
            <Icon name="pin" className="size-3.5" />
            {restaurant.area.nameJa}
          </span>
        )}
      </button>
      <div className="flex items-center justify-between gap-2 px-3.5 pb-3.5">
        <Rating averageRating={restaurant.averageRating} reviewCount={restaurant.reviewCount} />
        <Link
          to={`/restaurants/${restaurant.id}`}
          aria-label={`${restaurant.name}の詳細を見る`}
          className="flex shrink-0 items-center justify-center rounded-pill p-1.5 text-leaf-600 transition-colors hover:bg-leaf-50"
        >
          <Icon name="arrow-right" className="size-4" />
        </Link>
      </div>
    </motion.div>
  )
}

function MarkerPreview({ restaurant }: { restaurant: RestaurantSummary }) {
  return (
    <div className="min-w-46 space-y-1.5">
      <span className={`inline-block rounded-pill px-2.5 py-0.5 text-xs font-medium ${VEGETARIAN_TYPE_STYLES[restaurant.vegetarianType]}`}>
        {VEGETARIAN_TYPE_LABELS[restaurant.vegetarianType]}
      </span>
      <p className="text-sm font-bold text-bark-800">{restaurant.name}</p>
      {restaurant.categories.length > 0 && (
        <p className="text-xs text-bark-600">{restaurant.categories.map((c) => c.nameJa).join('・')}</p>
      )}
      <Rating averageRating={restaurant.averageRating} reviewCount={restaurant.reviewCount} />
      {restaurant.address && <p className="text-xs text-bark-400">{restaurant.address}</p>}
      <Link
        to={`/restaurants/${restaurant.id}`}
        className="mt-1 inline-flex items-center gap-1 rounded-pill bg-leaf-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-leaf-600"
      >
        詳細
        <Icon name="arrow-right" className="size-3.5" />
      </Link>
    </div>
  )
}
