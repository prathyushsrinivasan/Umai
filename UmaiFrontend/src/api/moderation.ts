import { apiRequest } from './client'
import type { PageResponse, RestaurantDetail, RestaurantSummary } from '../types/restaurant'

/** Publication states a restaurant can be in. */
export type RestaurantStatus = 'DRAFT' | 'PENDING' | 'PUBLISHED' | 'REJECTED'

export function fetchModerationQueue(
  status: RestaurantStatus,
  page = 0,
  signal?: AbortSignal,
): Promise<PageResponse<RestaurantSummary>> {
  return apiRequest<PageResponse<RestaurantSummary>>(
    `/admin/restaurants?status=${status}&page=${page}`,
    { signal },
  )
}

export function fetchPendingCount(signal?: AbortSignal): Promise<number> {
  return apiRequest<number>('/admin/restaurants/count', { signal })
}

export function approveRestaurant(id: number): Promise<RestaurantDetail> {
  return apiRequest<RestaurantDetail>(`/admin/restaurants/${id}/approve`, { method: 'POST' })
}

export function rejectRestaurant(id: number): Promise<RestaurantDetail> {
  return apiRequest<RestaurantDetail>(`/admin/restaurants/${id}/reject`, { method: 'POST' })
}
