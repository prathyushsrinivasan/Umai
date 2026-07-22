/**
 * Types mirroring the backend DTOs in
 * `UmaiBackend/src/main/java/com/umai/backend/restaurant/dto/`.
 *
 * Fields typed `| null` are genuinely absent for some restaurants — the data sources
 * are incomplete. Render the absence; never substitute a placeholder value.
 */

export type VegetarianType =
  | 'VEGAN_ONLY'
  | 'VEGETARIAN_ONLY'
  | 'VEGAN_FRIENDLY'
  | 'VEGETARIAN_FRIENDLY'
  | 'UNKNOWN'

export type PriceRange = 'BUDGET' | 'MODERATE' | 'EXPENSIVE'

export type RestaurantSource = 'SEED' | 'USER_SUBMISSION' | 'OPENSTREETMAP'

export interface Area {
  id: number
  slug: string
  nameJa: string
}

export interface Category {
  id: number
  slug: string
  nameJa: string
  description: string | null
}

export interface Tag {
  id: number
  slug: string
  nameJa: string
}

/** Restaurant as shown in lists, cards and map previews. */
export interface RestaurantSummary {
  id: number
  name: string
  description: string | null
  address: string | null
  latitude: number
  longitude: number
  vegetarianType: VegetarianType
  priceRange: PriceRange | null
  imageUrl: string | null
  area: Area | null
  categories: Category[]
  /** Null when the restaurant has no reviews — not zero. */
  averageRating: number | null
  reviewCount: number
}

/** Full restaurant record for the detail screen. */
export interface RestaurantDetail extends RestaurantSummary {
  websiteUrl: string | null
  phone: string | null
  openingHours: string | null
  tags: Tag[]
  source: RestaurantSource
  createdAt: string
  updatedAt: string
}

/** Paginated envelope returned by list and search endpoints. */
export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  first: boolean
  last: boolean
}

/** Response of the map bounding-box endpoint. */
export interface MapRestaurants {
  restaurants: RestaurantSummary[]
  totalInBounds: number
  /** True when matches were omitted, so the UI can suggest zooming in. */
  truncated: boolean
}

/** Geographic bounding box sent to the map endpoint. */
export interface MapBounds {
  minLat: number
  minLon: number
  maxLat: number
  maxLon: number
}

/**
 * Payload for submitting a restaurant.
 *
 * `source` and `status` are absent on purpose — the server decides both, so a client
 * cannot pass a submission off as imported data or self-approve it.
 */
export interface CreateRestaurantRequest {
  name: string
  description?: string
  address?: string
  latitude: number
  longitude: number
  vegetarianType: VegetarianType
  priceRange?: PriceRange
  websiteUrl?: string
  phone?: string
  openingHours?: string
  categorySlugs?: string[]
  areaSlug?: string
}

/** Filters accepted by the search endpoint. All optional, combined with AND. */
export interface RestaurantSearchParams {
  keyword?: string
  vegetarianTypes?: VegetarianType[]
  categories?: string[]
  tags?: string[]
  areas?: string[]
  priceRanges?: PriceRange[]
  minRating?: number
  page?: number
  size?: number
  sort?: string
}
