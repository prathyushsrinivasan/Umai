import type { RestaurantSummary } from '../types/restaurant'

/**
 * A fully-populated restaurant. Tests override individual fields to describe the
 * case under test, so each test states only what it depends on.
 */
export function makeRestaurant(overrides: Partial<RestaurantSummary> = {}): RestaurantSummary {
  return {
    id: 1,
    name: 'みどりの木キッチン',
    description: '野菜と豆を中心にした完全ヴィーガンの定食屋。',
    address: '東京都新宿区西新宿1-1-1',
    latitude: 35.6896,
    longitude: 139.7006,
    vegetarianType: 'VEGAN_ONLY',
    priceRange: 'MODERATE',
    imageUrl: null,
    area: { id: 1, slug: 'shinjuku', nameJa: '新宿' },
    categories: [{ id: 1, slug: 'washoku', nameJa: '和食', description: null }],
    averageRating: 4.6,
    reviewCount: 18,
    ...overrides,
  }
}
