import { useCallback } from 'react'
import { motion } from 'motion/react'
import { Link, useParams } from 'react-router-dom'

import { fetchRestaurant } from '../api/restaurants'
import { ApiError } from '../api/client'
import { RestaurantMiniMap } from '../components/map/RestaurantMiniMap'
import { RestaurantPhoto } from '../components/restaurant/RestaurantPhoto'
import { ReviewSection } from '../components/restaurant/ReviewSection'
import { Chip } from '../components/ui/Chip'
import { Icon } from '../components/ui/Icon'
import { Rating } from '../components/ui/Rating'
import { ErrorState, LoadingState } from '../components/ui/States'
import { useAsync } from '../hooks/useAsync'
import {
  PRICE_RANGE_LABELS,
  VEGETARIAN_TYPE_LABELS,
  VEGETARIAN_TYPE_STYLES,
} from '../lib/labels'

/**
 * 店舗詳細 — everything known about one restaurant.
 *
 * Sections for data we do not have are omitted rather than shown empty, and a short
 * note tells the user the information is simply missing.
 */
export function RestaurantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const restaurantId = Number(id)

  const load = useCallback(
    (signal: AbortSignal) => fetchRestaurant(restaurantId, signal),
    [restaurantId],
  )
  const { data: restaurant, loading, error, reload } = useAsync(load)

  if (!Number.isFinite(restaurantId)) {
    return <NotFound />
  }

  if (loading) return <LoadingState label="お店の情報を読み込んでいます…" />

  if (error) {
    if (error instanceof ApiError && error.status === 404) return <NotFound />
    return (
      <div className="mx-auto max-w-3xl px-5 py-16">
        <ErrorState onRetry={reload} />
      </div>
    )
  }

  if (!restaurant) return null

  const hasContactInfo = Boolean(restaurant.phone || restaurant.websiteUrl || restaurant.openingHours)

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="mx-auto max-w-4xl px-5 py-8"
    >
      <nav aria-label="パンくず" className="text-sm text-bark-400">
        <Link to="/" className="transition-colors hover:text-leaf-600">
          地図で探す
        </Link>
        <span aria-hidden="true" className="mx-2">
          /
        </span>
        <span className="text-bark-600">{restaurant.name}</span>
      </nav>

      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="hand-drawn crayon-border mt-4 overflow-hidden shadow-soft"
      >
        <RestaurantPhoto
          imageUrl={restaurant.imageUrl}
          name={restaurant.name}
          categories={restaurant.categories}
          className="h-52 sm:h-64"
        />
      </motion.div>

      <header className="mt-6">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-pill px-3.5 py-1.5 text-sm font-medium ${VEGETARIAN_TYPE_STYLES[restaurant.vegetarianType]}`}
          >
            {VEGETARIAN_TYPE_LABELS[restaurant.vegetarianType]}
          </span>
          {restaurant.categories.map((category) => (
            <Chip key={category.id} label={category.nameJa} readOnly />
          ))}
        </div>

        <h1 className="font-display mt-4 text-3xl text-bark-800 sm:text-4xl">{restaurant.name}</h1>

        <div className="mt-3">
          <Rating
            averageRating={restaurant.averageRating}
            reviewCount={restaurant.reviewCount}
            size="md"
          />
        </div>
      </header>

      {restaurant.description && (
        <p className="mt-6 leading-relaxed text-bark-600">{restaurant.description}</p>
      )}

      {restaurant.tags.length > 0 && (
        <section className="mt-6" aria-labelledby="tags-heading">
          <h2 id="tags-heading" className="sr-only">
            こだわり条件
          </h2>
          <div className="flex flex-wrap gap-2">
            {restaurant.tags.map((tag) => (
              <Chip
                key={tag.id}
                label={tag.nameJa}
                readOnly
                className="bg-leaf-50 text-leaf-700"
              />
            ))}
          </div>
        </section>
      )}

      <section className="mt-8" aria-labelledby="info-heading">
        <h2 id="info-heading" className="font-display text-xl text-bark-800">
          店舗情報
        </h2>

        <dl className="hand-drawn mt-4 divide-y divide-cream-200 overflow-hidden border border-cream-200 bg-white shadow-soft">
          {restaurant.area && <InfoRow label="エリア" value={restaurant.area.nameJa} />}
          {restaurant.address && <InfoRow label="住所" value={restaurant.address} />}
          {restaurant.openingHours && (
            <InfoRow label="営業時間" value={restaurant.openingHours} multiline />
          )}
          {restaurant.priceRange && (
            <InfoRow label="価格帯" value={PRICE_RANGE_LABELS[restaurant.priceRange]} />
          )}
          {restaurant.phone && (
            <InfoRow
              label="電話番号"
              value={
                <a href={`tel:${restaurant.phone}`} className="text-leaf-600 hover:underline">
                  {restaurant.phone}
                </a>
              }
            />
          )}
          {restaurant.websiteUrl && (
            <InfoRow
              label="Webサイト"
              value={
                <a
                  href={restaurant.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-leaf-600 hover:underline"
                >
                  {restaurant.websiteUrl}
                </a>
              }
            />
          )}
        </dl>

        {!hasContactInfo && (
          <p className="mt-3 text-sm text-bark-400">
            営業時間・電話番号・Webサイトの情報はまだ登録されていません。
          </p>
        )}
      </section>

      <section className="mt-8" aria-labelledby="map-heading">
        <h2 id="map-heading" className="font-display text-xl text-bark-800">
          地図
        </h2>
        <div className="hand-drawn-alt mt-4 overflow-hidden border border-cream-200 shadow-soft">
          <RestaurantMiniMap
            latitude={restaurant.latitude}
            longitude={restaurant.longitude}
            name={restaurant.name}
          />
        </div>
      </section>

      {/* Reloading the restaurant after a review change refreshes the aggregate
          rating in the header, which is derived from review data. */}
      <ReviewSection restaurantId={restaurant.id} onChanged={reload} />

      {restaurant.source === 'SEED' && (
        <p className="mt-8 rounded-cozy bg-cream-100 px-4 py-3 text-xs text-bark-400">
          ※ このお店は開発用のサンプルデータです。
        </p>
      )}
    </motion.article>
  )
}

interface InfoRowProps {
  label: string
  value: React.ReactNode
  multiline?: boolean
}

function InfoRow({ label, value, multiline = false }: InfoRowProps) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] gap-3 px-5 py-4 sm:grid-cols-[8rem_1fr]">
      <dt className="text-sm text-bark-400">{label}</dt>
      <dd className={`text-sm text-bark-800 ${multiline ? 'whitespace-pre-line' : ''}`}>{value}</dd>
    </div>
  )
}

function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-5 py-24 text-center">
      <Icon name="sprout" className="mx-auto size-10 text-leaf-400" />
      <h1 className="font-display mt-4 text-2xl text-bark-800">お店が見つかりませんでした</h1>
      <p className="mt-3 text-bark-600">
        削除されたか、URL が間違っている可能性があります。
      </p>
      <Link
        to="/"
        className="mt-8 inline-block rounded-pill bg-leaf-500 px-6 py-2.5 font-medium text-white shadow-soft transition-colors hover:bg-leaf-600"
      >
        地図で探す
      </Link>
    </div>
  )
}
