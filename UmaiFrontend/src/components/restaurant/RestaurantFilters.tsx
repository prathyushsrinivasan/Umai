import { useCallback } from 'react'

import { fetchAreas, fetchCategories, fetchTags } from '../../api/restaurants'
import { Chip } from '../ui/Chip'
import { useAsync } from '../../hooks/useAsync'
import {
  FILTERABLE_VEGETARIAN_TYPES,
  PRICE_RANGES,
  PRICE_RANGE_LABELS,
  VEGETARIAN_TYPE_LABELS,
} from '../../lib/labels'
import type { RestaurantSearchParams } from '../../types/restaurant'

type ToggleKey = 'vegetarianTypes' | 'categories' | 'tags' | 'areas' | 'priceRanges'

interface RestaurantFiltersProps {
  filters: RestaurantSearchParams
  onToggle: (key: ToggleKey, value: string) => void
  onMinRatingChange: (minRating: number | null) => void
  onClear: () => void
  activeFilterCount: number
}

/** Minimum ratings offered as filters. */
const RATING_OPTIONS = [3, 3.5, 4, 4.5]

/**
 * Filter panel for the search screen.
 *
 * Categories, areas and tags come from the API rather than a hard-coded list, so new
 * ones appear without a frontend change.
 */
export function RestaurantFilters({
  filters,
  onToggle,
  onMinRatingChange,
  onClear,
  activeFilterCount,
}: RestaurantFiltersProps) {
  const loadCategories = useCallback((signal: AbortSignal) => fetchCategories(signal), [])
  const loadAreas = useCallback((signal: AbortSignal) => fetchAreas(signal), [])
  const loadTags = useCallback((signal: AbortSignal) => fetchTags(signal), [])

  const categories = useAsync(loadCategories)
  const areas = useAsync(loadAreas)
  const tags = useAsync(loadTags)

  return (
    <div className="space-y-6 rounded-cozy border border-cream-200 bg-white p-6 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl text-bark-800">絞り込み</h2>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={onClear}
            aria-label={`条件をクリア (${activeFilterCount})`}
            className="flex cursor-pointer items-center gap-1 text-sm text-leaf-600 transition-colors hover:text-leaf-700"
          >
            <XIcon />
            {activeFilterCount}
          </button>
        )}
      </div>

      <FilterGroup label="ヴィーガン・ベジタリアン対応">
        {FILTERABLE_VEGETARIAN_TYPES.map((type) => (
          <Chip
            key={type}
            label={VEGETARIAN_TYPE_LABELS[type]}
            selected={filters.vegetarianTypes?.includes(type) ?? false}
            onClick={() => onToggle('vegetarianTypes', type)}
          />
        ))}
      </FilterGroup>

      {categories.data && (
        <FilterGroup label="料理ジャンル">
          {categories.data.map((category) => (
            <Chip
              key={category.id}
              label={category.nameJa}
              selected={filters.categories?.includes(category.slug) ?? false}
              onClick={() => onToggle('categories', category.slug)}
            />
          ))}
        </FilterGroup>
      )}

      {areas.data && (
        <FilterGroup label="エリア">
          {areas.data.map((area) => (
            <Chip
              key={area.id}
              label={area.nameJa}
              selected={filters.areas?.includes(area.slug) ?? false}
              onClick={() => onToggle('areas', area.slug)}
            />
          ))}
        </FilterGroup>
      )}

      <FilterGroup label="価格帯">
        {PRICE_RANGES.map((priceRange) => (
          <Chip
            key={priceRange}
            label={PRICE_RANGE_LABELS[priceRange]}
            selected={filters.priceRanges?.includes(priceRange) ?? false}
            onClick={() => onToggle('priceRanges', priceRange)}
          />
        ))}
      </FilterGroup>

      <FilterGroup label="評価">
        {RATING_OPTIONS.map((rating) => (
          <Chip
            key={rating}
            label={`★ ${rating} 以上`}
            selected={filters.minRating === rating}
            // Selecting the active option clears it, so the filter can be undone.
            onClick={() => onMinRatingChange(filters.minRating === rating ? null : rating)}
          />
        ))}
      </FilterGroup>

      {tags.data && (
        <FilterGroup label="こだわり条件">
          {tags.data.map((tag) => (
            <Chip
              key={tag.id}
              label={tag.nameJa}
              selected={filters.tags?.includes(tag.slug) ?? false}
              onClick={() => onToggle('tags', tag.slug)}
            />
          ))}
        </FilterGroup>
      )}
    </div>
  )
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-3.5">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-2.5 text-sm font-medium text-bark-600">{label}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  )
}
