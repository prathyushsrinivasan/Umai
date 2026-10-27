import { apiRequest } from './client'
import type {
  Area,
  Category,
  CreateRestaurantRequest,
  MapBounds,
  MapRestaurants,
  PageResponse,
  RestaurantDetail,
  RestaurantSearchParams,
  RestaurantSummary,
  Tag,
} from '../types/restaurant'

/**
 * Builds a query string, omitting empty values and repeating list parameters
 * (`?areas=ueno&areas=asakusa`), which is what Spring binds to a `List` parameter.
 */
function toQuery(params: Record<string, unknown>): string {
  const search = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue

    if (Array.isArray(value)) {
      for (const item of value) search.append(key, String(item))
    } else {
      search.append(key, String(value))
    }
  }

  const query = search.toString()
  return query ? `?${query}` : ''
}

export function searchRestaurants(
  params: RestaurantSearchParams,
  signal?: AbortSignal,
): Promise<PageResponse<RestaurantSummary>> {
  return apiRequest<PageResponse<RestaurantSummary>>(
    `/restaurants/search${toQuery({ ...params })}`,
    { signal },
  )
}

export function fetchRestaurant(id: number, signal?: AbortSignal): Promise<RestaurantDetail> {
  return apiRequest<RestaurantDetail>(`/restaurants/${id}`, { signal })
}

export function fetchFeaturedRestaurants(
  limit = 6,
  signal?: AbortSignal,
): Promise<RestaurantSummary[]> {
  return apiRequest<RestaurantSummary[]>(`/restaurants/featured${toQuery({ limit })}`, { signal })
}

export function fetchRestaurantsInBounds(
  bounds: MapBounds,
  signal?: AbortSignal,
): Promise<MapRestaurants> {
  return apiRequest<MapRestaurants>(`/restaurants/map${toQuery({ ...bounds })}`, { signal })
}

/** Submits a new restaurant. Requires an authenticated session. */
export function createRestaurant(request: CreateRestaurantRequest): Promise<RestaurantDetail> {
  return apiRequest<RestaurantDetail>('/restaurants', { method: 'POST', body: request })
}

// These three public lookup lists are shared across routes. Keep a bounded,
// short-lived cache; one component unmounting must not cancel another's request.
const referenceCache = new Map<string, { expires: number; promise: Promise<unknown> }>()
function referenceData<T>(path: string, signal?: AbortSignal): Promise<T> {
  if (signal?.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'))
  let entry = referenceCache.get(path)
  if (!entry || entry.expires < Date.now()) {
    const promise = apiRequest<T>(path).catch(error => { referenceCache.delete(path); throw error })
    entry = { expires: Date.now() + 300_000, promise }
    referenceCache.set(path, entry)
  }
  return entry.promise.then(value => {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    return value as T
  })
}

export function fetchCategories(signal?: AbortSignal): Promise<Category[]> {
  return referenceData<Category[]>('/categories', signal)
}

export function fetchAreas(signal?: AbortSignal): Promise<Area[]> {
  return referenceData<Area[]>('/areas', signal)
}

export function fetchTags(signal?: AbortSignal): Promise<Tag[]> {
  return referenceData<Tag[]>('/tags', signal)
}
