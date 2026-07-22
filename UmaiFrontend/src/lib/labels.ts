import type { PriceRange, VegetarianType } from '../types/restaurant'

/** Japanese labels for the diet classification. */
export const VEGETARIAN_TYPE_LABELS: Record<VegetarianType, string> = {
  VEGAN_ONLY: 'ヴィーガン専門',
  VEGETARIAN_ONLY: 'ベジタリアン専門',
  VEGAN_FRIENDLY: 'ヴィーガン対応',
  VEGETARIAN_FRIENDLY: 'ベジタリアン対応',
  UNKNOWN: '情報なし',
}

/**
 * Colour treatment per diet type. Dedicated (専門) restaurants get the stronger
 * green so they stand out from merely accommodating ones at a glance.
 */
export const VEGETARIAN_TYPE_STYLES: Record<VegetarianType, string> = {
  VEGAN_ONLY: 'bg-leaf-500 text-white',
  VEGETARIAN_ONLY: 'bg-leaf-400 text-white',
  VEGAN_FRIENDLY: 'bg-leaf-100 text-leaf-700',
  VEGETARIAN_FRIENDLY: 'bg-leaf-50 text-leaf-700',
  UNKNOWN: 'bg-cream-200 text-bark-600',
}

/** Diet types offered as filters, in the order they appear in the UI. */
export const FILTERABLE_VEGETARIAN_TYPES: VegetarianType[] = [
  'VEGAN_ONLY',
  'VEGETARIAN_ONLY',
  'VEGAN_FRIENDLY',
  'VEGETARIAN_FRIENDLY',
]

export const PRICE_RANGE_LABELS: Record<PriceRange, string> = {
  BUDGET: '〜1,000円',
  MODERATE: '1,000〜3,000円',
  EXPENSIVE: '3,000円〜',
}

/** Compact form for cards, where the full range is too long. */
export const PRICE_RANGE_SYMBOLS: Record<PriceRange, string> = {
  BUDGET: '¥',
  MODERATE: '¥¥',
  EXPENSIVE: '¥¥¥',
}

export const PRICE_RANGES: PriceRange[] = ['BUDGET', 'MODERATE', 'EXPENSIVE']

/** Formats an average rating, or returns null when there are no reviews. */
export function formatRating(averageRating: number | null): string | null {
  return averageRating === null ? null : averageRating.toFixed(1)
}
