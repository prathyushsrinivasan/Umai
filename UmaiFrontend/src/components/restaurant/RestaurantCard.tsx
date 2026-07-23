import { motion } from 'motion/react'
import { Link } from 'react-router-dom'

import { Rating } from '../ui/Rating'
import {
  PRICE_RANGE_SYMBOLS,
  VEGETARIAN_TYPE_LABELS,
  VEGETARIAN_TYPE_STYLES,
} from '../../lib/labels'
import type { RestaurantSummary } from '../../types/restaurant'

interface RestaurantCardProps {
  restaurant: RestaurantSummary
  /** Stagger index for the entrance animation. */
  index?: number
}

/**
 * Restaurant card used on the homepage, search results and the map's side list.
 *
 * Optional fields are omitted entirely when absent rather than rendered as "不明",
 * so a sparse record reads as a shorter card instead of a broken one.
 */
export function RestaurantCard({ restaurant, index = 0 }: RestaurantCardProps) {
  const { area, categories, priceRange, imageUrl, description } = restaurant

  return (
    <motion.article
      initial={{ opacity: 0, y: 12, rotate: index % 2 === 0 ? -0.6 : 0.5 }}
      animate={{ opacity: 1, y: 0, rotate: index % 2 === 0 ? -0.6 : 0.5 }}
      transition={{ duration: 0.35, delay: Math.min(index, 8) * 0.04, ease: 'easeOut' }}
      whileHover={{ y: -4, rotate: 0 }}
      className="group h-full"
    >
      <Link
        to={`/restaurants/${restaurant.id}`}
        className="sketchy-edge-strong flex h-full flex-col overflow-hidden rounded-cozy border border-cream-200 bg-white shadow-soft transition-shadow hover:shadow-lifted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf-500"
      >
        <RestaurantImage imageUrl={imageUrl} name={restaurant.name} />

        <div className="flex flex-1 flex-col p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-pill px-3 py-1 text-xs font-medium ${VEGETARIAN_TYPE_STYLES[restaurant.vegetarianType]}`}
            >
              {VEGETARIAN_TYPE_LABELS[restaurant.vegetarianType]}
            </span>
            {categories.map((category) => (
              <span
                key={category.id}
                className="rounded-pill bg-cream-100 px-3 py-1 text-xs text-bark-600"
              >
                {category.nameJa}
              </span>
            ))}
          </div>

          <h3 className="mt-3 font-bold text-bark-800 transition-colors group-hover:text-leaf-600">
            {restaurant.name}
          </h3>

          {description && (
            <p className="mt-2 line-clamp-2 text-sm text-bark-600">{description}</p>
          )}

          <div className="mt-auto pt-4">
            <div className="flex items-center justify-between gap-3">
              <Rating averageRating={restaurant.averageRating} reviewCount={restaurant.reviewCount} />
              {priceRange && (
                <span className="text-sm font-medium text-bark-600">
                  {PRICE_RANGE_SYMBOLS[priceRange]}
                </span>
              )}
            </div>

            {area && (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-bark-400">
                <span aria-hidden="true">📍</span>
                {area.nameJa}
              </p>
            )}
          </div>
        </div>
      </Link>
    </motion.article>
  )
}

/**
 * Most restaurants have no photograph — imported data rarely includes one. Rather
 * than a broken image or a grey box, absent images get a soft botanical pattern so
 * cards stay visually consistent.
 */
function RestaurantImage({ imageUrl, name }: { imageUrl: string | null; name: string }) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        loading="lazy"
        className="h-40 w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
    )
  }

  return (
    <div
      aria-hidden="true"
      className="flex h-24 w-full items-center justify-center bg-gradient-to-br from-leaf-50 to-cream-100"
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-9 text-leaf-300">
        <path
          d="M20 4c0 9-5.5 14-12 14-1 0-2-.2-2.8-.5C6 11 11 6.5 20 4Z"
          fill="currentColor"
          opacity="0.85"
        />
        <path d="M4 20c1-4.5 3.5-8 7.5-10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </div>
  )
}
