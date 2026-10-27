import { useCallback } from 'react'
import { motion } from 'motion/react'
import { Link, useParams } from 'react-router-dom'

import { fetchRestaurant, searchRestaurants } from '../api/restaurants'
import { ApiError } from '../api/client'
import { RestaurantMiniMap } from '../components/map/RestaurantMiniMap'
import { RestaurantPhoto } from '../components/restaurant/RestaurantPhoto'
import { ReviewSection } from '../components/restaurant/ReviewSection'
import { RestaurantDataInfo } from '../components/restaurant/RestaurantDataInfo'
import { Chip } from '../components/ui/Chip'
import { Icon } from '../components/ui/Icon'
import { Mascot } from '../components/ui/Mascot'
import { Rating } from '../components/ui/Rating'
import { ErrorState, LoadingState } from '../components/ui/States'
import { useAsync } from '../hooks/useAsync'
import { areaLabel, categoryLabel, tagLabel } from '../i18n/dataLabels'
import { useLanguage } from '../i18n/useLanguage'
import { useRomanized } from '../i18n/useRomanized'
import { VEGETARIAN_TYPE_STYLES } from '../lib/labels'

/**
 * 店舗詳細 — everything known about one restaurant.
 *
 * Sections for data we do not have are omitted rather than shown empty, and a short
 * note tells the user the information is simply missing.
 */
export function RestaurantDetailPage() {
  const { lang, t } = useLanguage()
  const { id } = useParams<{ id: string }>()
  const restaurantId = Number(id)

  const load = useCallback(
    (signal: AbortSignal) => fetchRestaurant(restaurantId, signal),
    [restaurantId],
  )
  const { data: restaurant, loading, error, reload } = useAsync(load)

  // Other branches of the same-named chain, so a chain's page can point to its other
  // locations. Runs once the restaurant (and thus its name) is known.
  const loadBranches = useCallback(
    (signal: AbortSignal) => {
      if (!restaurant) return Promise.resolve([])
      return searchRestaurants({ keyword: restaurant.name, size: 60 }, signal).then((page) =>
        page.content.filter((r) => r.name === restaurant.name && r.id !== restaurant.id),
      )
    },
    [restaurant],
  )
  const branches = useAsync(loadBranches)

  // Hooks must run unconditionally (before the early returns below), so these read
  // from `restaurant?.` and fall back to null while it's still loading.
  const name = useRomanized(restaurant?.name ?? null)
  const address = useRomanized(restaurant?.address ?? null)
  const description = useRomanized(restaurant?.description ?? null)
  const openingHours = useRomanized(restaurant?.openingHours ?? null)

  if (!Number.isFinite(restaurantId)) {
    return <NotFound />
  }

  if (loading) return <LoadingState label={t.detailPage.loadingLabel} />

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
      <nav aria-label={t.detailPage.breadcrumbAriaLabel} className="text-sm text-bark-400">
        <Link to="/" className="transition-colors hover:text-leaf-600">
          {t.detailPage.breadcrumbHome}
        </Link>
        <span aria-hidden="true" className="mx-2">
          /
        </span>
        <span className="text-bark-600">{name}</span>
      </nav>

      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="hand-drawn crayon-border relative mt-4 overflow-hidden shadow-soft"
      >
        <RestaurantPhoto
          imageUrl={restaurant.imageUrl}
          name={restaurant.name}
          categories={restaurant.categories}
          className="h-52 w-full sm:h-72"
        />
        <span
          className={`absolute left-3 top-3 rounded-pill px-3.5 py-1.5 text-sm font-medium shadow-soft ${VEGETARIAN_TYPE_STYLES[restaurant.vegetarianType]}`}
        >
          {t.vegetarianType[restaurant.vegetarianType]}
        </span>
      </motion.div>

      <header className="mt-6">
        <div className="flex items-start gap-3">
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: -8 }}
            transition={{ type: 'spring', stiffness: 260, damping: 15, delay: 0.15 }}
            className="shrink-0"
          >
            <Mascot mood="happy" size={52} />
          </motion.div>
          <h1 className="font-display text-3xl text-bark-800 sm:text-4xl">{name}</h1>
        </div>

        {restaurant.categories.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {restaurant.categories.map((category) => (
              <Chip key={category.id} label={categoryLabel(category, lang)} readOnly />
            ))}
          </div>
        )}

        <div className="mt-3">
          <Rating
            averageRating={restaurant.averageRating}
            reviewCount={restaurant.reviewCount}
            googleRating={restaurant.googleRating}
            googleRatingCount={restaurant.googleRatingCount}
            size="md"
          />
        </div>

        {restaurant.googlePlaceId && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.name)}&query_place_id=${restaurant.googlePlaceId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-pill bg-apricot-300 px-4 py-2 text-sm font-medium text-bark-800 shadow-soft transition-colors hover:bg-apricot-500 hover:text-white"
          >
            <Icon name="plate" className="size-4" />
            {t.detailPage.menuOnGoogle}
            <Icon name="arrow-right" className="size-3.5" />
          </a>
        )}
      </header>

      {description && <p className="mt-6 leading-relaxed text-bark-600">{description}</p>}

      {restaurant.tags.length > 0 && (
        <section className="mt-6" aria-labelledby="tags-heading">
          <h2 id="tags-heading" className="sr-only">
            {t.detailPage.tagsHeading}
          </h2>
          <div className="flex flex-wrap gap-2">
            {restaurant.tags.map((tag) => (
              <Chip
                key={tag.id}
                label={tagLabel(tag, lang)}
                readOnly
                className="bg-leaf-50 text-leaf-700"
              />
            ))}
          </div>
        </section>
      )}

      <section className="mt-8" aria-labelledby="info-heading">
        <h2 id="info-heading" className="font-display inline-flex items-center gap-2 text-xl text-bark-800 crayon-underline">
          <Icon name="plate" className="size-5 text-leaf-500" />
          {t.detailPage.info}
        </h2>

        <dl className="hand-drawn crayon-border mt-4 divide-y divide-cream-200 overflow-hidden bg-white shadow-soft">
          {restaurant.area && <InfoRow label={t.detailPage.area} value={areaLabel(restaurant.area, lang)} />}
          {address && <InfoRow label={t.detailPage.address} value={address} />}
          {openingHours && <InfoRow label={t.detailPage.hours} value={openingHours} multiline />}
          {restaurant.priceRange && (
            <InfoRow label={t.detailPage.price} value={t.priceRange[restaurant.priceRange]} />
          )}
          {restaurant.phone && (
            <InfoRow
              label={t.detailPage.phone}
              value={
                <a href={`tel:${restaurant.phone}`} className="text-leaf-600 hover:underline">
                  {restaurant.phone}
                </a>
              }
            />
          )}
          {restaurant.websiteUrl && (
            <InfoRow
              label={t.detailPage.website}
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
          <p className="mt-3 text-sm text-bark-400">{t.detailPage.noContactInfo}</p>
        )}
      </section>

      <section className="mt-8" aria-labelledby="map-heading">
        <h2 id="map-heading" className="font-display inline-flex items-center gap-2 text-xl text-bark-800 crayon-underline">
          <Icon name="pin" className="size-5 text-berry-500" />
          {t.detailPage.mapHeading}
        </h2>
        <div className="hand-drawn-alt crayon-border mt-4 overflow-hidden shadow-soft">
          <RestaurantMiniMap
            latitude={restaurant.latitude}
            longitude={restaurant.longitude}
            name={name ?? restaurant.name}
            vegetarianType={restaurant.vegetarianType}
            branches={(branches.data ?? []).map((b) => ({
              id: b.id,
              latitude: b.latitude,
              longitude: b.longitude,
              name: b.name,
              vegetarianType: b.vegetarianType,
            }))}
          />
        </div>

        {branches.data && branches.data.length > 0 && (
          <div className="mt-4">
            <h3 className="font-display text-base text-bark-800">
              {t.detailPage.branchesHeading(branches.data.length)}
            </h3>
            <ul className="mt-2 flex flex-wrap gap-2">
              {branches.data.map((branch) => (
                <li key={branch.id}>
                  <Link
                    to={`/restaurants/${branch.id}`}
                    className="hand-drawn inline-flex items-center gap-1.5 border-2 border-cream-200 bg-white px-3 py-1.5 text-sm text-bark-600 shadow-soft transition-colors hover:border-leaf-300 hover:text-leaf-700"
                  >
                    <Icon name="pin" className="size-3.5 text-berry-500" />
                    {branch.area ? areaLabel(branch.area, lang) : (branch.address ?? branch.name)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <RestaurantDataInfo key={restaurant.id} restaurant={restaurant} />

      {/* Reloading the restaurant after a review change refreshes the aggregate
          rating in the header, which is derived from review data. */}
      <ReviewSection restaurantId={restaurant.id} onChanged={reload} />

      {restaurant.source === 'SEED' && (
        <p className="mt-8 rounded-cozy bg-cream-100 px-4 py-3 text-xs text-bark-400">
          {t.detailPage.seedNotice}
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
  const { t } = useLanguage()
  return (
    <div className="mx-auto max-w-xl px-5 py-24 text-center">
      <Mascot mood="crying" size={72} className="mx-auto" />
      <h1 className="font-display mt-4 text-2xl text-bark-800">{t.detailPage.notFoundTitle}</h1>
      <p className="mt-3 text-bark-600">{t.detailPage.notFoundBody}</p>
      <Link
        to="/"
        className="mt-8 inline-block rounded-pill bg-leaf-500 px-6 py-2.5 font-medium text-white shadow-soft transition-colors hover:bg-leaf-600"
      >
        {t.detailPage.notFoundCta}
      </Link>
    </div>
  )
}
