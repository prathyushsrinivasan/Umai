import { useCallback, useEffect, useRef, useState } from 'react'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import { Link } from 'react-router-dom'

import { fetchRestaurantsInBounds } from '../api/restaurants'
import { MapBoundsWatcher } from '../components/map/MapBoundsWatcher'
import { Rating } from '../components/ui/Rating'
import { ErrorState } from '../components/ui/States'
import {
  OSM_ATTRIBUTION,
  OSM_TILE_URL,
  TOKYO_CENTER,
  TOKYO_DEFAULT_ZOOM,
  restaurantIcon,
  selectedRestaurantIcon,
} from '../lib/leaflet'
import { VEGETARIAN_TYPE_LABELS, VEGETARIAN_TYPE_STYLES } from '../lib/labels'
import type { MapBounds, MapRestaurants, RestaurantSummary } from '../types/restaurant'

/**
 * マップから探す — Tokyo restaurant map with a synchronised list.
 *
 * Results follow the visible bounds: panning or zooming re-queries the PostGIS
 * bounding-box endpoint rather than loading every restaurant up front.
 */
export function MapPage() {
  const [bounds, setBounds] = useState<MapBounds | null>(null)
  const [result, setResult] = useState<MapRestaurants | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  // Tracks the in-flight request so a slow earlier response cannot overwrite a
  // newer one when the user pans quickly.
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
        setResult(data)
        setLoading(false)
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return
        setError(cause instanceof Error ? cause : new Error(String(cause)))
        setLoading(false)
      })

    return () => controller.abort()
  }, [bounds])

  const restaurants = result?.restaurants ?? []

  return (
    <div className="mx-auto max-w-7xl px-5 py-8">
      <header>
        <h1 className="text-2xl font-bold text-bark-800">マップから探す</h1>
        <p className="mt-1 text-sm text-bark-600">
          地図を動かすと、表示範囲内のお店が一覧に反映されます。
        </p>
      </header>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="overflow-hidden rounded-cozy border border-cream-200 shadow-soft">
          <MapContainer
            center={TOKYO_CENTER}
            zoom={TOKYO_DEFAULT_ZOOM}
            scrollWheelZoom
            style={{ height: 'min(70vh, 620px)', width: '100%' }}
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
        </div>

        <aside aria-label="表示範囲内のお店" className="flex flex-col">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-bold text-bark-800">この範囲のお店</h2>
            {result && (
              <span className="text-sm text-bark-400">
                {loading ? '更新中…' : `${result.totalInBounds}件`}
              </span>
            )}
          </div>

          {result?.truncated && (
            <p className="mt-2 rounded-cozy bg-apricot-300/25 px-4 py-2.5 text-xs text-bark-800">
              件数が多いため一部のみ表示しています。地図を拡大すると絞り込まれます。
            </p>
          )}

          {error && (
            <div className="mt-3">
              <ErrorState onRetry={() => setBounds((current) => (current ? { ...current } : null))} />
            </div>
          )}

          {!error && !loading && restaurants.length === 0 && (
            <p className="mt-4 rounded-cozy border border-cream-200 bg-white p-6 text-center text-sm text-bark-600 shadow-soft">
              この範囲にお店が見つかりませんでした。
              <br />
              地図を移動または縮小してみてください。
            </p>
          )}

          <ul className="mt-3 max-h-[560px] space-y-3 overflow-y-auto pr-1">
            {restaurants.map((restaurant) => (
              <li key={restaurant.id}>
                {/*
                  The select control and the detail link are siblings, not nested:
                  an <a> inside a <button> is invalid HTML, and clicking the link
                  would also fire the button's handler.
                */}
                <div
                  className={`rounded-cozy border bg-white shadow-soft transition-colors ${
                    selectedId === restaurant.id
                      ? 'border-leaf-400 ring-2 ring-leaf-100'
                      : 'border-cream-200 hover:border-leaf-300'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedId(restaurant.id)}
                    aria-pressed={selectedId === restaurant.id}
                    className="w-full cursor-pointer p-4 pb-2 text-left"
                  >
                    <span
                      className={`inline-block rounded-pill px-2.5 py-0.5 text-xs font-medium ${VEGETARIAN_TYPE_STYLES[restaurant.vegetarianType]}`}
                    >
                      {VEGETARIAN_TYPE_LABELS[restaurant.vegetarianType]}
                    </span>
                    <span className="mt-2 block font-medium text-bark-800">{restaurant.name}</span>
                    {restaurant.area && (
                      <span className="mt-1 block text-xs text-bark-400">{restaurant.area.nameJa}</span>
                    )}
                  </button>

                  <div className="flex items-center justify-between gap-2 px-4 pb-4">
                    <Rating
                      averageRating={restaurant.averageRating}
                      reviewCount={restaurant.reviewCount}
                    />
                    <Link
                      to={`/restaurants/${restaurant.id}`}
                      className="shrink-0 text-xs font-medium text-leaf-600 hover:underline"
                    >
                      詳細 →
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  )
}

/** Compact preview shown when a marker is clicked. */
function MarkerPreview({ restaurant }: { restaurant: RestaurantSummary }) {
  return (
    <div className="min-w-46 space-y-1.5">
      <span
        className={`inline-block rounded-pill px-2.5 py-0.5 text-xs font-medium ${VEGETARIAN_TYPE_STYLES[restaurant.vegetarianType]}`}
      >
        {VEGETARIAN_TYPE_LABELS[restaurant.vegetarianType]}
      </span>

      <p className="text-sm font-bold text-bark-800">{restaurant.name}</p>

      {restaurant.categories.length > 0 && (
        <p className="text-xs text-bark-600">
          {restaurant.categories.map((category) => category.nameJa).join('・')}
        </p>
      )}

      <Rating averageRating={restaurant.averageRating} reviewCount={restaurant.reviewCount} />

      {restaurant.address && <p className="text-xs text-bark-400">{restaurant.address}</p>}

      <Link
        to={`/restaurants/${restaurant.id}`}
        className="mt-1 inline-block rounded-pill bg-leaf-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-leaf-600"
      >
        詳細を見る
      </Link>
    </div>
  )
}
