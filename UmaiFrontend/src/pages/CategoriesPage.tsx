import { useCallback } from 'react'
import { motion } from 'motion/react'
import { Link } from 'react-router-dom'

import { fetchAreas, fetchCategories } from '../api/restaurants'
import { LoadingState, ErrorState } from '../components/ui/States'
import { useAsync } from '../hooks/useAsync'
import { FILTERABLE_VEGETARIAN_TYPES, VEGETARIAN_TYPE_LABELS } from '../lib/labels'

/**
 * タイプから探す — browse entry points by diet, cuisine genre and area.
 *
 * Every tile links into the search page with the matching filter pre-applied, so
 * browsing and searching share one implementation.
 */
export function CategoriesPage() {
  const loadCategories = useCallback((signal: AbortSignal) => fetchCategories(signal), [])
  const loadAreas = useCallback((signal: AbortSignal) => fetchAreas(signal), [])

  const categories = useAsync(loadCategories)
  const areas = useAsync(loadAreas)

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <header>
        <h1 className="text-2xl font-bold text-bark-800">タイプから探す</h1>
        <p className="mt-1 text-sm text-bark-600">
          対応の種類、料理ジャンル、エリアからお店を探せます。
        </p>
      </header>

      <section className="mt-10" aria-labelledby="diet-heading">
        <h2 id="diet-heading" className="text-lg font-bold text-bark-800">
          ヴィーガン・ベジタリアン対応
        </h2>

        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {FILTERABLE_VEGETARIAN_TYPES.map((type, index) => (
            <TileLink
              key={type}
              index={index}
              to={`/search?vegetarianTypes=${type}`}
              label={VEGETARIAN_TYPE_LABELS[type]}
              icon="🌿"
            />
          ))}
        </ul>
      </section>

      <section className="mt-10" aria-labelledby="cuisine-heading">
        <h2 id="cuisine-heading" className="text-lg font-bold text-bark-800">
          料理ジャンル
        </h2>

        {categories.loading && <LoadingState />}
        {categories.error && (
          <div className="mt-4">
            <ErrorState onRetry={categories.reload} />
          </div>
        )}

        {categories.data && (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.data.map((category, index) => (
              <TileLink
                key={category.id}
                index={index}
                to={`/search?categories=${category.slug}`}
                label={category.nameJa}
                description={category.description ?? undefined}
                icon="🍽️"
              />
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10" aria-labelledby="area-heading">
        <h2 id="area-heading" className="text-lg font-bold text-bark-800">
          エリア
        </h2>

        {areas.error && (
          <div className="mt-4">
            <ErrorState onRetry={areas.reload} />
          </div>
        )}

        {areas.data && (
          <ul className="mt-4 flex flex-wrap gap-3">
            {areas.data.map((area) => (
              <li key={area.id}>
                <Link
                  to={`/search?areas=${area.slug}`}
                  className="inline-flex rounded-pill border border-cream-300 bg-white px-5 py-2.5 text-bark-600 shadow-soft transition-colors hover:border-leaf-300 hover:text-leaf-700"
                >
                  {area.nameJa}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

interface TileLinkProps {
  to: string
  label: string
  description?: string
  icon: string
  index: number
}

function TileLink({ to, label, description, icon, index }: TileLinkProps) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index, 8) * 0.04 }}
    >
      <Link
        to={to}
        className="flex h-full items-start gap-3 rounded-cozy border border-cream-200 bg-white px-5 py-4 shadow-soft transition-all hover:-translate-y-0.5 hover:border-leaf-300 hover:shadow-lifted"
      >
        <span aria-hidden="true" className="text-xl">
          {icon}
        </span>
        <span>
          <span className="block font-medium text-bark-800">{label}</span>
          {description && <span className="mt-1 block text-sm text-bark-600">{description}</span>}
        </span>
      </Link>
    </motion.li>
  )
}
