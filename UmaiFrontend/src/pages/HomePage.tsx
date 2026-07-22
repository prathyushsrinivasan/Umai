import { useCallback } from 'react'
import { motion } from 'motion/react'
import { Link, useNavigate } from 'react-router-dom'

import { fetchCategories, fetchFeaturedRestaurants } from '../api/restaurants'
import { RestaurantCard } from '../components/restaurant/RestaurantCard'
import { SearchBar } from '../components/ui/SearchBar'
import { CardSkeletonGrid, ErrorState } from '../components/ui/States'
import { useAsync } from '../hooks/useAsync'
import { FILTERABLE_VEGETARIAN_TYPES, VEGETARIAN_TYPE_LABELS } from '../lib/labels'

/**
 * Homepage: says what the service is, and offers the main ways in — keyword search,
 * the map, diet and cuisine browsing, plus a few well-rated restaurants.
 */
export function HomePage() {
  const navigate = useNavigate()

  const loadFeatured = useCallback((signal: AbortSignal) => fetchFeaturedRestaurants(6, signal), [])
  const loadCategories = useCallback((signal: AbortSignal) => fetchCategories(signal), [])

  const featured = useAsync(loadFeatured)
  const categories = useAsync(loadCategories)

  function handleSearch(keyword: string) {
    navigate(keyword ? `/search?keyword=${encodeURIComponent(keyword)}` : '/search')
  }

  return (
    <>
      <Hero onSearch={handleSearch} />

      <div className="mx-auto max-w-6xl space-y-16 px-5 pb-20">
        <section aria-labelledby="diet-heading">
          <SectionHeading id="diet-heading" title="対応で探す" subtitle="食事の条件からお店を絞り込めます" />

          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {FILTERABLE_VEGETARIAN_TYPES.map((type, index) => (
              <motion.li
                key={type}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Link
                  to={`/search?vegetarianTypes=${type}`}
                  className="flex items-center justify-between rounded-cozy border border-cream-200 bg-white px-5 py-4 shadow-soft transition-all hover:-translate-y-0.5 hover:border-leaf-300 hover:shadow-lifted"
                >
                  <span className="font-medium text-bark-800">{VEGETARIAN_TYPE_LABELS[type]}</span>
                  <span aria-hidden="true" className="text-leaf-500">
                    →
                  </span>
                </Link>
              </motion.li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="cuisine-heading">
          <SectionHeading
            id="cuisine-heading"
            title="ジャンルで探す"
            subtitle="料理の種類からお店を見つけましょう"
            action={{ to: '/categories', label: 'すべて見る' }}
          />

          {categories.error && <div className="mt-6"><ErrorState onRetry={categories.reload} /></div>}

          {categories.data && (
            <ul className="mt-6 flex flex-wrap gap-3">
              {categories.data.map((category) => (
                <li key={category.id}>
                  <Link
                    to={`/search?categories=${category.slug}`}
                    className="inline-flex rounded-pill border border-cream-300 bg-white px-5 py-2.5 text-bark-600 shadow-soft transition-colors hover:border-leaf-300 hover:text-leaf-700"
                  >
                    {category.nameJa}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="featured-heading">
          <SectionHeading
            id="featured-heading"
            title="評価の高いお店"
            subtitle="いま注目されているお店をご紹介します"
            action={{ to: '/search', label: 'もっと見る' }}
          />

          <div className="mt-6">
            {featured.loading && <CardSkeletonGrid count={3} />}
            {featured.error && <ErrorState onRetry={featured.reload} />}
            {featured.data && featured.data.length > 0 && (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {featured.data.map((restaurant, index) => (
                  <RestaurantCard key={restaurant.id} restaurant={restaurant} index={index} />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  )
}

function Hero({ onSearch }: { onSearch: (keyword: string) => void }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-leaf-50 to-cream-50 px-5 py-16 sm:py-24">
      {/* Decorative leaves, purely visual. */}
      <span aria-hidden="true" className="absolute -left-8 top-10 text-8xl opacity-15 select-none">
        🌿
      </span>
      <span aria-hidden="true" className="absolute -right-6 bottom-6 text-8xl opacity-15 select-none">
        🌱
      </span>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative mx-auto max-w-3xl text-center"
      >
        <span className="inline-block rounded-pill bg-white/80 px-4 py-1.5 text-sm font-medium text-leaf-700 shadow-soft">
          東京 · ベジタリアン & ヴィーガン
        </span>

        <h1 className="mt-6 text-3xl font-bold leading-snug tracking-tight text-bark-800 sm:text-4xl">
          東京で、あなたにぴったりの
          <br className="hidden sm:block" />
          ベジタリアン・ヴィーガンのお店を見つけよう
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-bark-600">
          マップ、キーワード検索、ジャンル別のカテゴリから、お店をゆっくり探せます。
        </p>

        <div className="mx-auto mt-8 max-w-xl">
          <SearchBar size="lg" onSubmit={onSearch} />
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to="/map"
            className="inline-flex items-center gap-2 rounded-pill bg-white px-6 py-3 font-medium text-bark-800 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lifted"
          >
            <span aria-hidden="true">🗺️</span>
            マップから探す
          </Link>
          <Link
            to="/search"
            className="inline-flex items-center gap-2 rounded-pill bg-white px-6 py-3 font-medium text-bark-800 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lifted"
          >
            <span aria-hidden="true">🔍</span>
            お店を探す
          </Link>
        </div>
      </motion.div>
    </section>
  )
}

interface SectionHeadingProps {
  id: string
  title: string
  subtitle?: string
  action?: { to: string; label: string }
}

function SectionHeading({ id, title, subtitle, action }: SectionHeadingProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 id={id} className="text-xl font-bold text-bark-800">
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-sm text-bark-600">{subtitle}</p>}
      </div>
      {action && (
        <Link
          to={action.to}
          className="text-sm font-medium text-leaf-600 transition-colors hover:text-leaf-700"
        >
          {action.label} →
        </Link>
      )}
    </div>
  )
}
